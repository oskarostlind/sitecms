/**
 * Bilagor till offertförfrågningar: regler för uppladdning, igenkänning av
 * filtyp på innehållet (inte bara den påstådda MIME-typen), och radering av
 * blobbar när en förfrågan tas bort. Delas av upload-endpointen
 * (app/api/v1/_lib/quote-attachments.ts), API-handlern för förfrågningar och
 * panelens radering (lib/actions/quotes.ts).
 */
import { del } from "@vercel/blob";
import { and, eq, lt } from "drizzle-orm";
import { db, quoteUploads, type QuoteAttachment } from "@/lib/db";

/** Max filstorlek per bilaga. OBS: Vercels funktioner tar emot högst 4,5 MB per anrop. */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

/** Uppladdningar per timme och ipHash (per sajt). */
export const ATTACHMENT_RATE_LIMIT_PER_HOUR = 30;
/** Utan ipHash delar hela sajten en hink — bara ett skydd mot missbruk. */
export const ATTACHMENT_SITE_RATE_LIMIT_PER_HOUR = 200;

/** Uppladdningar som inte bifogats någon förfrågan inom denna tid städas bort. */
export const ORPHAN_UPLOAD_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const ALLOWED_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
] as const;
export type AllowedAttachmentType = (typeof ALLOWED_ATTACHMENT_TYPES)[number];

const EXTENSION_FOR: Record<AllowedAttachmentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
};

export function formatMaxAttachmentSize(): string {
  return `${Math.round(MAX_ATTACHMENT_BYTES / (1024 * 1024))} MB`;
}

/** Normaliserar vanliga stavningar ("image/jpg", versaler) till den tillåtna typen, annars null. */
export function normalizeAttachmentType(type: string | null | undefined): AllowedAttachmentType | null {
  const t = (type ?? "").trim().toLowerCase().split(";")[0];
  if (t === "image/jpg" || t === "image/pjpeg") return "image/jpeg";
  return (ALLOWED_ATTACHMENT_TYPES as readonly string[]).includes(t) ? (t as AllowedAttachmentType) : null;
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

/** ISO-BMFF "brands" för HEIC (iPhone-bilder) respektive generell HEIF. */
const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx"]);
const HEIF_BRANDS = new Set(["heim", "heis", "mif1", "msf1"]);

/**
 * Känner igen filtypen på de första byten (magic numbers). Den påstådda
 * MIME-typen från klienten litar vi inte på — blobben blir publikt läsbar,
 * så bara riktiga bilder och pdf:er får lagras.
 */
export function sniffAttachmentType(head: Uint8Array): AllowedAttachmentType | null {
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "image/jpeg";
  if (head.length >= 8 && ascii(head, 1, 3) === "PNG" && head[0] === 0x89) return "image/png";
  if (head.length >= 12 && ascii(head, 0, 4) === "RIFF" && ascii(head, 8, 4) === "WEBP") return "image/webp";
  if (head.length >= 5 && ascii(head, 0, 5) === "%PDF-") return "application/pdf";
  if (head.length >= 12 && ascii(head, 4, 4) === "ftyp") {
    const brand = ascii(head, 8, 4).toLowerCase();
    if (HEIC_BRANDS.has(brand)) return "image/heic";
    if (HEIF_BRANDS.has(brand)) return "image/heif";
  }
  return null;
}

/**
 * Filnamn säkert för en blob-sökväg: bara a–z, 0–9, punkt, bindestreck,
 * understreck; max 80 tecken; filändelse enligt den igenkända typen.
 */
export function sanitizeAttachmentName(original: string, type: AllowedAttachmentType): string {
  const base = original.split(/[\\/]/).pop() ?? "";
  const withoutExt = base.replace(/\.[^.]*$/, "");
  const cleaned = withoutExt
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 80);
  return `${cleaned || "bilaga"}.${EXTENSION_FOR[type]}`;
}

/** true om URL:en pekar på vår Vercel Blob-store (bara sådana raderas med del()). */
export function isVercelBlobUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return url.startsWith("https://") && (host.endsWith(".public.blob.vercel-storage.com") || host.endsWith(".blob.vercel-storage.com"));
  } catch {
    return false;
  }
}

/**
 * Raderar bilagornas blobbar. Bara URL:er på vår blob-store tas bort —
 * en sajt får skicka egna https-URL:er som bilagor och dem rör vi inte.
 * Fel loggas men kastas aldrig: raderingen av förfrågan får inte stoppas
 * av att en blob redan är borta.
 */
export async function deleteAttachmentBlobs(attachments: ReadonlyArray<Pick<QuoteAttachment, "url">> | null | undefined): Promise<void> {
  const urls = (attachments ?? []).map((a) => a.url).filter(isVercelBlobUrl);
  if (urls.length === 0 || !process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    await del(urls);
  } catch (err) {
    console.error("quote-attachments: kunde inte radera blobbar", err);
  }
}

/**
 * Markerar uppladdningar som använda (raderar deras rader i quote_uploads)
 * när förfrågan som refererar dem har sparats.
 */
export async function claimUploads(siteId: string, attachments: ReadonlyArray<Pick<QuoteAttachment, "url">> | null | undefined): Promise<void> {
  const urls = (attachments ?? []).map((a) => a.url);
  for (const url of urls) {
    await db.delete(quoteUploads).where(and(eq(quoteUploads.siteId, siteId), eq(quoteUploads.url, url)));
  }
}

/**
 * Städar bort uppladdningar som aldrig bifogades en förfrågan (äldre än ett
 * dygn): blobben raderas och raden tas bort. Körs i samband med
 * retention-städningen när en ny förfrågan sparas.
 */
export async function purgeOrphanUploads(siteId: string): Promise<number> {
  const cutoff = new Date(Date.now() - ORPHAN_UPLOAD_MAX_AGE_MS);
  const orphans = await db
    .select({ id: quoteUploads.id, url: quoteUploads.url })
    .from(quoteUploads)
    .where(and(eq(quoteUploads.siteId, siteId), lt(quoteUploads.createdAt, cutoff)))
    .limit(100);
  if (orphans.length === 0) return 0;
  await deleteAttachmentBlobs(orphans);
  for (const o of orphans) {
    await db.delete(quoteUploads).where(eq(quoteUploads.id, o.id));
  }
  return orphans.length;
}
