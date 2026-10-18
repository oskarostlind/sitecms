import { NextResponse } from "next/server";
import { count, eq } from "drizzle-orm";
import { db, pages, sites } from "@/lib/db";
import { authenticateSite, CONTENT_CACHE_HEADERS } from "@/app/api/v1/_lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/sites/[slug]/health
 *
 * Snabb kontroll av att slug + API-nyckel stämmer, utan att hämta allt
 * innehåll. Tänkt för curl under uppsättningen och för övervakning:
 *
 *   curl -H "x-api-key: $CMS_API_KEY" $CMS_API_URL/api/v1/sites/$CMS_SITE/health
 *
 * Svar 200: { ok: true, site: { name, slug }, pages: number, lastSchemaSyncAt: string | null }
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

  const { site } = auth;

  const [[pageCount], [siteRow]] = await Promise.all([
    db.select({ n: count() }).from(pages).where(eq(pages.siteId, site.id)),
    db.select({ lastSchemaSyncAt: sites.lastSchemaSyncAt }).from(sites).where(eq(sites.id, site.id)).limit(1),
  ]);

  return NextResponse.json(
    {
      ok: true,
      site: { name: site.name, slug: site.slug },
      pages: Number(pageCount?.n ?? 0),
      lastSchemaSyncAt: siteRow?.lastSchemaSyncAt ? siteRow.lastSchemaSyncAt.toISOString() : null,
    },
    { headers: CONTENT_CACHE_HEADERS },
  );
}
