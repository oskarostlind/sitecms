import { NextResponse } from "next/server";
import { authenticateSite } from "@/app/api/v1/_lib/auth";
import { quoteAttachmentUploadResponse } from "@/app/api/v1/_lib/quote-attachments";

export const runtime = "nodejs";

/**
 * POST /api/v1/sites/[slug]/quote-requests/attachments
 *
 * Slug-varianten av /api/v1/site/quote-requests/attachments — identiskt svar.
 * Logik: app/api/v1/_lib/quote-attachments.ts.
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const auth = await authenticateSite(slug, request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  return quoteAttachmentUploadResponse(auth.site, request);
}
