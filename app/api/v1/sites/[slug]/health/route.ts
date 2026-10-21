import { NextResponse } from "next/server";
import { authenticateSite, CONTENT_CACHE_HEADERS } from "@/app/api/v1/_lib/auth";
import { healthResponse } from "@/app/api/v1/_lib/health";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/sites/[slug]/health
 *
 * Snabb kontroll av att slug + API-nyckel stämmer, utan att hämta allt
 * innehåll. Tänkt för curl under uppsättningen och för övervakning:
 *
 *   curl -H "x-api-key: $CMS_API_KEY" $CMS_API_URL/api/v1/sites/$CMS_SITE/health
 *
 * Svar 200: { ok: true, site: { name, slug }, pages: number, lastSchemaSyncAt: string | null,
 *             revalidateUrl: string | null, webhook: { configured, lastStatus, lastAt, lastError } }
 * (se app/api/v1/_lib/health.ts).
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

  return healthResponse(auth.site);
}
