import { NextResponse } from "next/server";
import { authenticateSite } from "@/app/api/v1/_lib/auth";
import { contentResponse } from "@/app/api/v1/_lib/content";

/**
 * GET /api/v1/sites/[slug]/content
 *
 * Everything a customer site needs to build/render itself in one call.
 * Requires a valid "x-api-key" header for the site. Response format: see
 * app/api/v1/_lib/content.ts (shared with GET /api/v1/site/content).
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

  return contentResponse(auth.site, request);
}
