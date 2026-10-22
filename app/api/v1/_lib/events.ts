import { NextResponse } from "next/server";
import { CONTENT_CACHE_HEADERS, type ApiSite } from "@/app/api/v1/_lib/auth";
import { recordPageviews } from "@/lib/traffic";
import { analyticsSalt, normalizeEvents, utcDay } from "@/lib/traffic-normalize";

/** Max storlek på body i bytes (§3). */
const MAX_BODY_BYTES = 4096;
/** Max events per sajt och minut (per instans räcker, §3). */
const RATE_LIMIT_PER_MINUTE = 600;
const RATE_WINDOW_MS = 60_000;

/** Enkel minnesräknare per sajt: nollställs när fönstret löpt ut. */
const rateWindows = new Map<string, { startedAt: number; count: number }>();

/** true när sajten får skicka `n` events till, annars false (429). */
function allowEvents(siteId: string, n: number, now = Date.now()): boolean {
  let window = rateWindows.get(siteId);
  if (!window || now - window.startedAt >= RATE_WINDOW_MS) {
    window = { startedAt: now, count: 0 };
    rateWindows.set(siteId, window);
    // Städa gamla fönster då och då så att kartan inte växer med antalet sajter.
    if (rateWindows.size > 1000) {
      for (const [key, value] of rateWindows) if (now - value.startedAt >= RATE_WINDOW_MS) rateWindows.delete(key);
    }
  }
  if (window.count + n > RATE_LIMIT_PER_MINUTE) return false;
  window.count += n;
  return true;
}

/** Anropets IP: första adressen i x-forwarded-for, annars x-real-ip. */
function requestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() ?? "";
}

function error(status: number, message: string): Response {
  return NextResponse.json({ error: message }, { status, headers: CONTENT_CACHE_HEADERS });
}

function noContent(): Response {
  return new Response(null, { status: 204, headers: CONTENT_CACHE_HEADERS });
}

/**
 * Shared body of POST /api/v1/site/events and POST /api/v1/sites/[slug]/events
 * (docs/SEO-TRAFIK.md §3).
 *
 * Kundsajtens route (sitecms-next/analytics) skickar `{ events: [{ p, r, q,
 * ua, ip, c }] }` server-till-server med x-api-key. Här valideras formen,
 * robotar filtreras bort, varje event normaliseras (sökväg, källa, land,
 * enhet, dagsbunden besökarhash) och dagsaggregaten uppdateras. IP och UA
 * används bara för hashen och lagras aldrig. Svaret är 204 även när allt
 * filtrerats bort.
 */
export async function eventsResponse(site: ApiSite, request: Request): Promise<Response> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return error(413, "Body är för stor (max 4 kB).");

  let text: string;
  try {
    text = await request.text();
  } catch {
    return error(400, "Ogiltig body.");
  }
  if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) return error(413, "Body är för stor (max 4 kB).");

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return error(400, "Ogiltig JSON.");
  }

  const result = normalizeEvents(body, {
    siteId: site.id,
    domain: site.domain,
    day: utcDay(),
    salt: analyticsSalt(),
    fallbackIp: requestIp(request),
  });
  if (!result.ok) return error(400, result.error);

  const rawCount = Array.isArray((body as { events?: unknown[] }).events) ? (body as { events: unknown[] }).events.length : 1;
  if (!allowEvents(site.id, rawCount)) {
    return error(429, "För många events för sajten just nu (max 600 per minut). Försök igen om en stund.");
  }

  if (result.events.length === 0) return noContent();
  await recordPageviews(site.id, result.events);
  return noContent();
}
