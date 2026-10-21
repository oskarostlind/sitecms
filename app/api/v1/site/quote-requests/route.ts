import { NextResponse } from "next/server";
import { authenticateByKey } from "@/app/api/v1/_lib/auth";
import { quoteRequestResponse } from "@/app/api/v1/_lib/quote-requests";

/**
 * POST /api/v1/site/quote-requests
 *
 * Sajten identifieras av API-nyckeln (header x-api-key) — ingen slug behövs,
 * så kundsajten klarar sig med CMS_API_KEY. Svaret är identiskt med
 * slug-varianten /api/v1/sites/[slug]/quote-requests.
 */
export async function POST(request: Request) {
  const auth = await authenticateByKey(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  return quoteRequestResponse(auth.site, request);
}
