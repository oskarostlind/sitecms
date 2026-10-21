import { NextResponse } from "next/server";
import { authenticateSite } from "@/app/api/v1/_lib/auth";
import { postResponse } from "@/app/api/v1/_lib/posts";

/**
 * GET /api/v1/sites/[slug]/posts/[postSlug]
 *
 * The full post (including markdown body). Only returns posts that are
 * published - drafts are invisible to the public API. Response format: see
 * app/api/v1/_lib/posts.ts.
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

  return postResponse(auth.site, postSlug);
}
