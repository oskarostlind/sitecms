import { NextResponse } from "next/server";
import { authenticateSite, CONTENT_CACHE_HEADERS } from "@/app/api/v1/_lib/auth";
import { previewVerifyResponse } from "@/app/api/v1/_lib/preview";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/sites/[slug]/preview
 *
 * Verifierar en token för live-förhandsgranskning (headers x-api-key och
 * x-sitecms-preview). Svar: se app/api/v1/_lib/preview.ts (delas med
 * GET /api/v1/site/preview).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const auth = await authenticateSite(slug, request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status, headers: CONTENT_CACHE_HEADERS });
  }

  return previewVerifyResponse(auth.site, request);
}
