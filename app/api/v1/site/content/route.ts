import { NextResponse } from "next/server";
import { authenticateByKey } from "@/app/api/v1/_lib/auth";
import { contentResponse } from "@/app/api/v1/_lib/content";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/site/content
 *
 * Sajten identifieras av API-nyckeln (header x-api-key) — ingen slug behövs,
 * så kundsajten klarar sig med CMS_API_KEY. Svaret är identiskt med
 * slug-varianten /api/v1/sites/[slug]/content.
 */
export async function GET(request: Request) {
  const auth = await authenticateByKey(request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  return contentResponse(auth.site, request);
}
