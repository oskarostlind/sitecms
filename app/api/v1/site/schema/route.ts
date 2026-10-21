import { NextResponse } from "next/server";
import { authenticateByKey, CONTENT_CACHE_HEADERS } from "@/app/api/v1/_lib/auth";
import { schemaGetResponse, schemaPostResponse } from "@/app/api/v1/_lib/schema";

export const dynamic = "force-dynamic";

function authError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: CONTENT_CACHE_HEADERS });
}

/**
 * GET /api/v1/site/schema
 *
 * Sajten identifieras av API-nyckeln (header x-api-key) — ingen slug behövs,
 * så kundsajten klarar sig med CMS_API_KEY. Svaret är identiskt med
 * slug-varianten /api/v1/sites/[slug]/schema.
 */
export async function GET(request: Request) {
  const auth = await authenticateByKey(request);
  if (!auth.ok) return authError(auth.error, auth.status);

  return schemaGetResponse(auth.site);
}

/**
 * POST /api/v1/site/schema
 *
 * Sajten identifieras av API-nyckeln (header x-api-key) — ingen slug behövs,
 * så kundsajten klarar sig med CMS_API_KEY. Svaret är identiskt med
 * slug-varianten /api/v1/sites/[slug]/schema
 * (inklusive valfritt siteUrl, se app/api/v1/_lib/schema.ts).
 */
export async function POST(request: Request) {
  const auth = await authenticateByKey(request);
  if (!auth.ok) return authError(auth.error, auth.status);

  return schemaPostResponse(auth.site, request);
}
