import { NextResponse } from "next/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, blocks, pages, seoMeta, services } from "@/lib/db";
import { authenticateSite, CONTENT_CACHE_HEADERS } from "@/app/api/v1/_lib/auth";
import { markdownToHtml } from "@/lib/markdown";

/**
 * GET /api/v1/sites/[slug]/content
 *
 * Everything a customer site needs to build/render itself in one call: site
 * info, every page with its ordered blocks, visible services (ordered), and
 * all SEO metadata. Requires a valid "x-api-key" header for the site.
 *
 * Blocks carry two extra fields alongside the existing `value`, both additive
 * so existing consumers keep working unchanged:
 *   alt   image blocks: the customer's description of the picture
 *   html  richtext blocks: `value` rendered from markdown, ready to drop into
 *         the page (formatting written in the editor shows up as formatting
 *         instead of literal ** characters)
 *   label, help  editor label/help text (usually from schema sync), or null
 * Pages likewise carry `description` (or null).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const auth = await authenticateSite(slug, request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { site } = auth;

  const [sitePages, siteServices, siteSeo] = await Promise.all([
    db.select().from(pages).where(eq(pages.siteId, site.id)).orderBy(asc(pages.sortOrder)),
    db
      .select()
      .from(services)
      .where(and(eq(services.siteId, site.id), eq(services.visible, true)))
      .orderBy(asc(services.sortOrder)),
    db.select().from(seoMeta).where(eq(seoMeta.siteId, site.id)),
  ]);

  const pageIds = sitePages.map((page) => page.id);
  const allBlocks = pageIds.length
    ? await db
        .select()
        .from(blocks)
        .where(inArray(blocks.pageId, pageIds))
        .orderBy(asc(blocks.sortOrder))
    : [];

  const blocksByPageId = new Map<string, typeof allBlocks>();
  for (const block of allBlocks) {
    const existing = blocksByPageId.get(block.pageId);
    if (existing) {
      existing.push(block);
    } else {
      blocksByPageId.set(block.pageId, [block]);
    }
  }

  const body = {
    site: { name: site.name, domain: site.domain },
    pages: sitePages.map((page) => ({
      slug: page.slug,
      title: page.title,
      description: page.description,
      blocks: (blocksByPageId.get(page.id) ?? []).map((block) => ({
        key: block.key,
        type: block.type,
        value: block.value,
        alt: block.type === "image" ? block.alt : null,
        html: block.type === "richtext" ? markdownToHtml(block.value) : null,
        label: block.label,
        help: block.help,
      })),
    })),
    services: siteServices.map((service) => ({
      title: service.title,
      description: service.description,
      price: service.price,
    })),
    seo: siteSeo.map((entry) => ({
      pageSlug: entry.pageSlug,
      title: entry.title,
      description: entry.description,
      ogImage: entry.ogImage,
    })),
  };

  return NextResponse.json(body, { headers: CONTENT_CACHE_HEADERS });
}
