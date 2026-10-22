import { NextResponse } from "next/server";
import { authenticateByKey } from "@/app/api/v1/_lib/auth";
import { quoteAttachmentUploadResponse } from "@/app/api/v1/_lib/quote-attachments";

export const runtime = "nodejs";

/**
 * POST /api/v1/site/quote-requests/attachments
 *
 * Laddar upp en bilaga (multipart/form-data, fältet `file`) till en
 * offertförfrågan innan själva förfrågan skickas. Sajten identifieras av
 * API-nyckeln (x-api-key). Svaret `{ url, name, contentType, size }` skickas
 * sedan i `attachments` på POST /api/v1/site/quote-requests.
 * Logik: app/api/v1/_lib/quote-attachments.ts.
 */
export async function POST(request: Request) {
  const auth = await authenticateByKey(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  return quoteAttachmentUploadResponse(auth.site, request);
}
