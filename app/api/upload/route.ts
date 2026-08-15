import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { media } from "@/lib/db/schema";
import { requireSiteAccess } from "@/lib/guard";
import {
  MAX_UPLOAD_BYTES,
  formatMaxUploadSize,
  isAllowedImageType,
} from "@/lib/actions/upload";

export const runtime = "nodejs";

/**
 * POST /api/upload
 * multipart/form-data: { file: File, siteId: string }
 *
 * Kräver inloggning + åtkomst till siteId (requireSiteAccess). Sparar
 * filen i Vercel Blob med slumpad suffix, registrerar den i media-tabellen
 * och returnerar { url }.
 */
export async function POST(req: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Bilduppladdning är inte konfigurerad ännu. Hör av dig till oss så ordnar vi det.",
      },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Ogiltig förfrågan." },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  const siteId = formData.get("siteId");

  if (!(file instanceof File) || typeof siteId !== "string" || !siteId) {
    return NextResponse.json(
      { error: "Fil eller sajt saknas i förfrågan." },
      { status: 400 }
    );
  }

  try {
    await requireSiteAccess(siteId);
  } catch {
    return NextResponse.json(
      { error: "Du har inte åtkomst till den här sajten." },
      { status: 403 }
    );
  }

  if (!isAllowedImageType(file.type)) {
    return NextResponse.json(
      { error: "Filtypen stöds inte. Använd JPG, PNG, WEBP, GIF eller SVG." },
      { status: 400 }
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `Bilden är för stor. Max ${formatMaxUploadSize()}.` },
      { status: 400 }
    );
  }

  try {
    const blob = await put(`sites/${siteId}/${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    });

    await db.insert(media).values({
      siteId,
      url: blob.url,
      filename: file.name,
      contentType: file.type,
      size: file.size,
    });

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("POST /api/upload: uppladdning misslyckades", err);
    return NextResponse.json(
      { error: "Uppladdningen misslyckades. Försök igen." },
      { status: 500 }
    );
  }
}
