import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { db, quoteUploads } from "@/lib/db";
import type { ApiSite } from "@/app/api/v1/_lib/auth";
import {
  ATTACHMENT_RATE_LIMIT_PER_HOUR,
  ATTACHMENT_SITE_RATE_LIMIT_PER_HOUR,
  MAX_ATTACHMENT_BYTES,
  formatMaxAttachmentSize,
  normalizeAttachmentType,
  sanitizeAttachmentName,
  sniffAttachmentType,
} from "@/lib/quote-attachments";
import { QUOTE_LIMITS } from "@/lib/quote-validation";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function fail(error: string, status: number): Response {
  return NextResponse.json({ error }, { status, headers: NO_STORE });
}

/**
 * Shared body of POST /api/v1/site/quote-requests/attachments and
 * POST /api/v1/sites/[slug]/quote-requests/attachments.
 *
 * multipart/form-data: `file` (jpg/png/webp/heic/pdf, max 10 MB) and an
 * optional `ipHash` (same salted hash the site sends with the request).
 * The file is stored in Vercel Blob and the response is the attachment
 * object the site then sends in `attachments` on the quote request itself:
 * `201 { url, name, contentType, size }`.
 *
 * Rate limit: 30 uploads per hour and ipHash (per site); without ipHash the
 * whole site shares a bucket of 200/h as an abuse guard.
 */
export async function quoteAttachmentUploadResponse(site: ApiSite, request: Request): Promise<Response> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return fail("Bilagor är inte konfigurerade på servern (BLOB_READ_WRITE_TOKEN saknas).", 503);
  }

  // Early 413 from Content-Length so a too-large body is refused before it is read.
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_ATTACHMENT_BYTES + 64 * 1024) {
    return fail(`Filen är för stor. Max ${formatMaxAttachmentSize()}.`, 413);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return fail("Ogiltig förfrågan. Skicka multipart/form-data med fältet file.", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return fail("Fältet file saknas.", 400);
  }
  if (file.size === 0) {
    return fail("Filen är tom.", 400);
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return fail(`Filen är för stor. Max ${formatMaxAttachmentSize()}.`, 413);
  }

  const rawIpHash = formData.get("ipHash");
  const ipHash = typeof rawIpHash === "string" && /^[a-f0-9]{16,128}$/.test(rawIpHash) ? rawIpHash : null;

  // Rate limit on stored uploads (quote_uploads), per ipHash or per site.
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const limit = ipHash ? ATTACHMENT_RATE_LIMIT_PER_HOUR : ATTACHMENT_SITE_RATE_LIMIT_PER_HOUR;
  const scope = ipHash ? eq(quoteUploads.ipHash, ipHash) : isNull(quoteUploads.ipHash);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(quoteUploads)
    .where(and(eq(quoteUploads.siteId, site.id), scope, gte(quoteUploads.createdAt, since)));
  if (count >= limit) {
    return fail("För många uppladdningar från samma adress. Försök igen om en stund.", 429);
  }

  // Trust the bytes, not the declared type: the blob becomes publicly readable.
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const detected = sniffAttachmentType(head);
  if (!detected) {
    return fail("Filtypen stöds inte. Använd JPG, PNG, WEBP, HEIC eller PDF.", 400);
  }
  const declaredType = normalizeAttachmentType(file.type);
  if (declaredType && declaredType !== detected && !(declaredType.startsWith("image/hei") && detected.startsWith("image/hei"))) {
    return fail("Filens innehåll stämmer inte med dess filtyp.", 400);
  }

  const originalName = (file.name || "").trim().slice(0, QUOTE_LIMITS.attachmentNameLength) || sanitizeAttachmentName("bilaga", detected);
  const safeName = sanitizeAttachmentName(originalName, detected);

  try {
    // access: "public" — kundsajten och panelen visar filen direkt via URL:en,
    // utan proxy. Det är säkert nog eftersom adressen är ogissbar: ett uuid i
    // sökvägen plus Vercels slumpade suffix (addRandomSuffix), och blobbar
    // listas aldrig publikt. Den som har länken har fått den från förfrågan.
    const blob = await put(`quotes/${site.id}/${crypto.randomUUID()}-${safeName}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: detected,
    });

    await db.insert(quoteUploads).values({
      siteId: site.id,
      ipHash,
      url: blob.url,
      name: originalName,
      contentType: detected,
      size: file.size,
    });

    return NextResponse.json(
      { url: blob.url, name: originalName, contentType: detected, size: file.size },
      { status: 201, headers: NO_STORE },
    );
  } catch (err) {
    console.error("quote-attachments: uppladdning misslyckades", err);
    return fail("Uppladdningen misslyckades. Försök igen.", 500);
  }
}
