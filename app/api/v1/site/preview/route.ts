import { NextResponse } from "next/server";
import { authenticateByKey, CONTENT_CACHE_HEADERS } from "@/app/api/v1/_lib/auth";
import { previewVerifyResponse } from "@/app/api/v1/_lib/preview";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/site/preview
 *
 * Verifierar en token för live-förhandsgranskning (headers x-api-key och
 * x-sitecms-preview). Sajten identifieras av API-nyckeln. Svaret är identiskt
 * med slug-varianten /api/v1/sites/[slug]/preview — se app/api/v1/_lib/preview.ts.
 */
export async function GET(request: Request) {
  const auth = await authenticateByKey(request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status, headers: CONTENT_CACHE_HEADERS });
  }

  return previewVerifyResponse(auth.site, request);
}
