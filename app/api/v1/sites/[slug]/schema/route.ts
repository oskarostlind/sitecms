import { NextResponse } from "next/server";
import { authenticateSite, CONTENT_CACHE_HEADERS } from "@/app/api/v1/_lib/auth";
import { schemaGetResponse, schemaPostResponse } from "@/app/api/v1/_lib/schema";

function authError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: CONTENT_CACHE_HEADERS });
}

/**
 * GET /api/v1/sites/[slug]/schema
 *
 * Nuvarande struktur i samma format som POST-schemat — utan `default`, men
 * med `hasValue` per block — så att utvecklaren kan diffa mot sin config.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const auth = await authenticateSite(slug, request);
  if (!auth.ok) return authError(auth.error, auth.status);

  return schemaGetResponse(auth.site);
}

/**
 * POST /api/v1/sites/[slug]/schema
 *
 * Kundsajten deklarerar sina sidor och fält; CMS:et skapar det som saknas och
 * uppdaterar etiketter/ordning. Kundens innehåll skrivs aldrig över.
 * Format och regler: docs/SELF-SERVICE.md (avsnitt B), lib/schema-validate.ts
 * och app/api/v1/_lib/schema.ts (valfritt siteUrl).
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const auth = await authenticateSite(slug, request);
  if (!auth.ok) return authError(auth.error, auth.status);

  return schemaPostResponse(auth.site, request);
}
