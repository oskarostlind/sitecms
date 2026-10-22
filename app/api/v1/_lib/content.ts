import { NextResponse } from "next/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, blocks, pages, seoMeta, services } from "@/lib/db";
import { CONTENT_CACHE_HEADERS, type ApiSite } from "@/app/api/v1/_lib/auth";
import { markdownToHtml } from "@/lib/markdown";
import { applyPreviewOverrides, findValidPreviewSession, readPreviewHeader } from "@/lib/preview";
import { previewInvalidResponse } from "@/app/api/v1/_lib/preview";

/**
 * Shared body of GET /api/v1/sites/[slug]/content and GET /api/v1/site/content.
 *
 * Everything a customer site needs to build/render itself in one call: site
 * info, every page with its ordered blocks, visible services (ordered), and
 * all SEO metadata.
 *
 * Blocks carry two extra fields alongside the existing `value`, both additive
 * so existing consumers keep working unchanged:
 *   alt   image blocks: the customer's description of the picture
 *   html  richtext blocks: `value` rendered from markdown, ready to drop into
 *         the page (formatting written in the editor shows up as formatting
 *         instead of literal ** characters)
 *   label, help  editor label/help text (usually from schema sync), or null
 * Pages likewise carry `description` (or null).
 *
 * Live preview (docs/LIVE-PREVIEW.md §3.1): when the request carries
 * `x-sitecms-preview: <token>` for a valid session on this site, the
 * session's unsaved values replace `value` (and `alt` when the override has
 * one), `html` is recomputed from the merged markdown, and the body gets
 * `"preview": true`. Invalid/expired token → 401 `preview_invalid`. Without
 * the header the response is exactly as before.
 */
export async function contentResponse(site: ApiSite, request?: Request): Promise<Response> {
  const previewToken = request ? readPreviewHeader(request) : null;
  const previewSession = previewToken ? await findValidPreviewSession(site.id, previewToken) : null;
  if (previewToken && !previewSession) {
    return previewInvalidResponse();
  }

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
  const savedBlocks = pageIds.length
    ? await db
        .select()
        .from(blocks)
        .where(inArray(blocks.pageId, pageIds))
        .orderBy(asc(blocks.sortOrder))
    : [];
  const allBlocks = previewSession ? applyPreviewOverrides(savedBlocks, previewSession.overrides) : savedBlocks;

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
    ...(previewSession ? { preview: true } : {}),
  };

  return NextResponse.json(body, { headers: CONTENT_CACHE_HEADERS });
}
