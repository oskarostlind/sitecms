/**
 * Hämtar allt `scoreContent` behöver för en sajt (docs/SEO-TRAFIK.md §6) i
 * fyra parallella queries: sidor, block, seo_meta och inlägg.
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { blocks, pages, posts, seoMeta } from "@/lib/db/schema";
import type { ContentBlockInput, ContentInput, ContentPageInput } from "./content";

export async function loadContentInput(siteId: string): Promise<ContentInput> {
  const [pageRows, blockRows, seoRows, postRows] = await Promise.all([
    db
      .select({ id: pages.id, slug: pages.slug, title: pages.title })
      .from(pages)
      .where(eq(pages.siteId, siteId)),
    db
      .select({ pageId: blocks.pageId, type: blocks.type, value: blocks.value, alt: blocks.alt })
      .from(blocks)
      .where(eq(blocks.siteId, siteId)),
    db
      .select({
        id: seoMeta.id,
        pageSlug: seoMeta.pageSlug,
        title: seoMeta.title,
        description: seoMeta.description,
        ogImage: seoMeta.ogImage,
      })
      .from(seoMeta)
      .where(eq(seoMeta.siteId, siteId)),
    db
      .select({
        id: posts.id,
        published: posts.published,
        publishedAt: posts.publishedAt,
        coverImage: posts.coverImage,
        coverImageAlt: posts.coverImageAlt,
      })
      .from(posts)
      .where(eq(posts.siteId, siteId)),
  ]);

  const blocksByPage = new Map<string, ContentBlockInput[]>();
  for (const block of blockRows) {
    const list = blocksByPage.get(block.pageId) ?? [];
    list.push(block);
    blocksByPage.set(block.pageId, list);
  }

  const pageInputs: ContentPageInput[] = pageRows.map((page) => ({
    ...page,
    blocks: blocksByPage.get(page.id) ?? [],
  }));

  return { pages: pageInputs, seoMeta: seoRows, posts: postRows, now: new Date() };
}
