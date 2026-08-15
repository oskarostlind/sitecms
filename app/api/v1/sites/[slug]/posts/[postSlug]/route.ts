import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, posts } from "@/lib/db";
import { authenticateSite, CONTENT_CACHE_HEADERS } from "@/app/api/v1/_lib/auth";

/**
 * GET /api/v1/sites/[slug]/posts/[postSlug]
 *
 * The full post (including markdown body). Only returns posts that are
 * published - drafts are invisible to the public API.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; postSlug: string }> },
) {
  const { slug, postSlug } = await params;
  const auth = await authenticateSite(slug, request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [post] = await db
    .select()
    .from(posts)
    .where(
      and(
        eq(posts.siteId, auth.site.id),
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
        coverImage: post.coverImage,
        publishedAt: post.publishedAt,
      },
    },
    { headers: CONTENT_CACHE_HEADERS },
  );
}
