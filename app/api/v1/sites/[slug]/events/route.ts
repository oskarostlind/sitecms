import { NextResponse } from "next/server";
import { authenticateSite, CONTENT_CACHE_HEADERS } from "@/app/api/v1/_lib/auth";
import { eventsResponse } from "@/app/api/v1/_lib/events";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/sites/[slug]/events
 *
 * Slug-varianten av /api/v1/site/events (för sajter som fortfarande sätter
 * CMS_SITE). Samma body, samma svar — se app/api/v1/_lib/events.ts.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const auth = await authenticateSite(slug, request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status, headers: CONTENT_CACHE_HEADERS });
  }

  return eventsResponse(auth.site, request);
}
