import { NextResponse } from "next/server";
import { authenticateByKey, CONTENT_CACHE_HEADERS } from "@/app/api/v1/_lib/auth";
import { healthResponse } from "@/app/api/v1/_lib/health";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/site/health
 *
 * Sajten identifieras av API-nyckeln (header x-api-key) — ingen slug behövs,
 * så kundsajten klarar sig med CMS_API_KEY. Svaret är identiskt med
 * slug-varianten /api/v1/sites/[slug]/health:
 *
 *   curl -H "x-api-key: $CMS_API_KEY" https://sitecms.se/api/v1/site/health
 */
export async function GET(request: Request) {
  const auth = await authenticateByKey(request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status, headers: CONTENT_CACHE_HEADERS });
  }

  return healthResponse(auth.site);
}
