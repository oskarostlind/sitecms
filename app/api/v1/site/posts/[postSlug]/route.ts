import { NextResponse } from "next/server";
import { authenticateByKey } from "@/app/api/v1/_lib/auth";
import { postResponse } from "@/app/api/v1/_lib/posts";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/site/posts/[postSlug]
 *
 * Sajten identifieras av API-nyckeln (header x-api-key) — ingen slug behövs,
 * så kundsajten klarar sig med CMS_API_KEY. Svaret är identiskt med
 * slug-varianten /api/v1/sites/[slug]/posts/[postSlug].
 */
export async function GET(request: Request, { params }: { params: Promise<{ postSlug: string }> }) {
  const { postSlug } = await params;
  const auth = await authenticateByKey(request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  return postResponse(auth.site, postSlug);
}
