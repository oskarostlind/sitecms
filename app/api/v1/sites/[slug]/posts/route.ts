import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db, posts } from "@/lib/db";
import { authenticateSite, CONTENT_CACHE_HEADERS } from "@/app/api/v1/_lib/auth";

/**
 * GET /api/v1/sites/[slug]/posts
 *
 * Published posts only, without the (potentially large) markdown body -
 * meant for listing pages. Fetch the single-post endpoint for the body.
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

  const rows = await db
    .select({
      slug: posts.slug,
      title: posts.title,
      excerpt: posts.excerpt,
      coverImage: posts.coverImage,
      coverImageAlt: posts.coverImageAlt,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .where(and(eq(posts.siteId, auth.site.id), eq(posts.published, true)))
    .orderBy(desc(posts.publishedAt));

  return NextResponse.json({ posts: rows }, { headers: CONTENT_CACHE_HEADERS });
}
