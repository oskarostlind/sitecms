import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db, posts } from "@/lib/db";
import { CONTENT_CACHE_HEADERS, type ApiSite } from "@/app/api/v1/_lib/auth";
import { markdownToHtml } from "@/lib/markdown";

/**
 * Shared body of GET /api/v1/sites/[slug]/posts and GET /api/v1/site/posts.
 *
 * Published posts only, without the (potentially large) markdown body -
 * meant for listing pages. Fetch the single-post endpoint for the body.
 */
export async function postsResponse(site: ApiSite): Promise<Response> {
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
    .where(and(eq(posts.siteId, site.id), eq(posts.published, true)))
    .orderBy(desc(posts.publishedAt));

  return NextResponse.json({ posts: rows }, { headers: CONTENT_CACHE_HEADERS });
}

/**
 * Shared body of GET /api/v1/sites/[slug]/posts/[postSlug] and
 * GET /api/v1/site/posts/[postSlug].
 *
 * The full post (including markdown body). Only returns posts that are
 * published - drafts are invisible to the public API.
 *
 * `bodyHtml` is `body` rendered from markdown, and `coverImageAlt` is the
 * customer's description of the cover image. Both are additive - `body` still
 * holds the markdown for consumers that render it themselves.
 */
export async function postResponse(site: ApiSite, postSlug: string): Promise<Response> {
  const [post] = await db
    .select()
    .from(posts)
    .where(
      and(
        eq(posts.siteId, site.id),
        eq(posts.slug, postSlug),
        eq(posts.published, true),
      ),
    )
    .limit(1);

  if (!post) {
    return NextResponse.json({ error: "Inlägget hittades inte." }, { status: 404 });
  }

  return NextResponse.json(
    {
      post: {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        body: post.body,
        bodyHtml: markdownToHtml(post.body),
        coverImage: post.coverImage,
        coverImageAlt: post.coverImageAlt,
        publishedAt: post.publishedAt,
      },
    },
    { headers: CONTENT_CACHE_HEADERS },
  );
}
