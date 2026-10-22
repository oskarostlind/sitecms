import { NextResponse } from "next/server";
import { authenticateByKey, CONTENT_CACHE_HEADERS } from "@/app/api/v1/_lib/auth";
import { eventsResponse } from "@/app/api/v1/_lib/events";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/site/events
 *
 * Sidvisningar från kundsajtens pixel (sitecms-next/analytics). Sajten
 * identifieras av API-nyckeln (header x-api-key) — ingen slug behövs.
 * Body: { events: [{ p, r?, q?, ua?, ip?, c?, t? }] } (max 20 events, 4 kB).
 * Svar 204, även när allt filtrerats bort. Se docs/SEO-TRAFIK.md §3.
 */
export async function POST(request: Request) {
  const auth = await authenticateByKey(request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status, headers: CONTENT_CACHE_HEADERS });
  }

  return eventsResponse(auth.site, request);
}
