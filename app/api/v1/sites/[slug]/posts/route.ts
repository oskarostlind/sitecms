import { NextResponse } from "next/server";
import { authenticateSite } from "@/app/api/v1/_lib/auth";
import { postsResponse } from "@/app/api/v1/_lib/posts";

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

  return postsResponse(auth.site);
}
