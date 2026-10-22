/**
 * Trafik — egen cookiefri pixel (sitecms-next 0.6).
 *
 *   // app/api/sitecms/events/route.ts
 *   export { POST } from "sitecms-next/analytics";
 *
 *   // app/layout.tsx, sist i <body>
 *   import { SitecmsAnalytics } from "sitecms-next/analytics";
 *   <SitecmsAnalytics />
 *
 * Komponenten skickar sidvisningar till sajtens egen route, som fyller på
 * IP, user agent och land från anropet och skickar vidare till sitecms med
 * API-nyckeln. Nyckeln når aldrig webbläsaren, routen är first-party och
 * sitecms lagrar bara dagsaggregat (aldrig IP, UA eller råevents).
 *
 * I förhandsgranskningen (draft mode) renderar `<SitecmsAnalytics />` null,
 * så panelens klick aldrig räknas som trafik.
 */
import { apiBase, isPreview } from "./index.js";
import { SitecmsAnalyticsClient } from "./analytics-client.js";

export { isPreview };
export type { SitecmsAnalyticsClientProps, AnalyticsPayload } from "./analytics-client.js";
export { shouldTrack, utmQuery } from "./analytics-client.js";

/** Sökvägen som `sitecms-next init` skapar routen på. */
export const ANALYTICS_ROUTE_PATH = "/api/sitecms/events";

/** Max storlek på body från webbläsaren (bytes). */
const MAX_BODY_BYTES = 2048;
/** Max väntetid på sitecms (ms) — kundens funktion får aldrig hänga på pixeln. */
const FORWARD_TIMEOUT_MS = 5000;

/** `AbortSignal.timeout` när det finns (Node 17.3+), annars egen AbortController. */
function timeoutSignal(ms: number): { signal: AbortSignal; clear: () => void } {
  const AS = AbortSignal as typeof AbortSignal & { timeout?: (ms: number) => AbortSignal };
  if (typeof AS.timeout === "function") return { signal: AS.timeout(ms), clear: () => {} };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("timeout")), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

function env(name: string): string {
  return (typeof process !== "undefined" && process.env?.[name]?.trim()) || "";
}

const NO_CONTENT_HEADERS = { "Cache-Control": "private, no-store" };

function noContent(): Response {
  return new Response(null, { status: 204, headers: NO_CONTENT_HEADERS });
}

let warnedOnce = false;
/** Varnar högst en gång per process — pixeln får aldrig spamma loggen. */
function warnOnce(message: string) {
  if (warnedOnce) return;
  warnedOnce = true;
  console.warn(message);
}

/** Första adressen i x-forwarded-for, annars x-real-ip. */
function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() ?? "";
}

/** Landskod från Vercel/Cloudflare, annars tom. */
function clientCountry(headers: Headers): string {
  return (headers.get("x-vercel-ip-country")?.trim() || headers.get("cf-ipcountry")?.trim() || "");
}

/** Sajtens egen värd (bakom proxy: x-forwarded-host). */
function ownHost(headers: Headers): string {
  const raw = (headers.get("x-forwarded-host") ?? headers.get("host") ?? "").split(",")[0].trim();
  if (!raw) return "";
  try {
    return new URL(`http://${raw}`).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** Referer från sajtens egen värd räknas som direkt — skickas inte vidare. */
function externalReferrer(referrer: string, host: string): string {
  if (!referrer) return "";
  try {
    const refHost = new URL(referrer).hostname.toLowerCase();
    const strip = (h: string) => h.replace(/^www\./, "");
    if (host && strip(refHost) === strip(host)) return "";
  } catch {
    return "";
  }
  return referrer;
}

/** Det som skickas vidare till sitecms per sidvisning. */
export type AnalyticsEvent = { p: string; r?: string; q?: string; ua?: string; ip?: string; c?: string };

export type AnalyticsRouteOptions = {
  /** Bas-URL till sitecms. Default CMS_API_URL, annars "https://sitecms.se". */
  apiUrl?: string;
  /** Sajtens slug (valfri, som klienten). Default CMS_SITE om apiKey inte anges. */
  site?: string;
  /** API-nyckel. Default CMS_API_KEY. */
  apiKey?: string;
  /** Egen fetch, t.ex. för tester. Default globalThis.fetch. */
  fetch?: typeof fetch;
  /** Max väntetid på sitecms i ms. Default 5000. */
  timeoutMs?: number;
};

/**
 * Skapar events-routen. Utelämnade värden läses från miljön på samma sätt
 * som `createSitecms` (CMS_API_KEY, CMS_API_URL, CMS_SITE).
 *
 * `POST` läser `{ p, r, q }` från webbläsaren (max 2 kB), lägger till `ua`,
 * `ip` och `c` från anropet och skickar `{ events: [{…}] }` till
 * `${apiBase}/events` med `x-api-key` och 5 s timeout. Svarar alltid 204
 * till webbläsaren — även när sitecms svarar fel eller inte svarar i tid (en
 * varning i loggen, högst en per process) och även utan CMS_API_KEY (då
 * skickas inget vidare).
 */
export function createAnalyticsRoute(options: AnalyticsRouteOptions = {}) {
  return async function POST(request: Request): Promise<Response> {
    const explicitKey = options.apiKey !== undefined;
    const apiKey = (options.apiKey ?? env("CMS_API_KEY")).trim();
    if (!apiKey) return noContent();

    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > MAX_BODY_BYTES) return noContent();

    type Payload = { p?: unknown; r?: unknown; q?: unknown };
    let parsed: unknown;
    try {
      const text = await request.text();
      if (!text || text.length > MAX_BODY_BYTES) return noContent();
      parsed = JSON.parse(text);
    } catch {
      return noContent();
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return noContent();
    const payload = parsed as Payload;
    if (typeof payload.p !== "string" || !payload.p.trim()) return noContent();

    const headers = request.headers;
    const event: AnalyticsEvent = { p: payload.p.trim().slice(0, 2048) };
    const r = typeof payload.r === "string" ? externalReferrer(payload.r.trim().slice(0, 2000), ownHost(headers)) : "";
    if (r) event.r = r;
    const q = typeof payload.q === "string" ? payload.q.trim().replace(/^\?/, "").slice(0, 500) : "";
    if (q) event.q = q;
    const ua = (headers.get("user-agent") ?? "").trim().slice(0, 1000);
    if (ua) event.ua = ua;
    const ip = clientIp(headers);
    if (ip) event.ip = ip;
    const c = clientCountry(headers);
    if (c) event.c = c;

    const base = apiBase(options.apiUrl ?? env("CMS_API_URL"), options.site ?? (explicitKey ? "" : env("CMS_SITE")));
    const doFetch = options.fetch ?? globalThis.fetch;
    const timeout = timeoutSignal(options.timeoutMs ?? FORWARD_TIMEOUT_MS);
    try {
      const res = await doFetch(`${base}/events`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({ events: [event] }),
        cache: "no-store",
        signal: timeout.signal,
      });
      if (!res.ok && res.status !== 204) {
        warnOnce(`sitecms: trafikpixeln fick ${res.status} från ${base}/events — kontrollera CMS_API_KEY och att sitecms är uppdaterat.`);
      }
    } catch (error) {
      warnOnce(`sitecms: trafikpixeln kunde inte nå ${base}/events (${error instanceof Error ? error.message : String(error)}).`);
    } finally {
      timeout.clear();
    }
    return noContent();
  };
}

/** Events-routen med standardinställningar (läser CMS_API_KEY, CMS_API_URL, CMS_SITE). */
export const POST = createAnalyticsRoute();

// ---------------------------------------------------------------------------
// <SitecmsAnalytics /> — i app/layout.tsx
// ---------------------------------------------------------------------------

export type SitecmsAnalyticsProps = {
  /** Sajtens route som tar emot sidvisningar. Default "/api/sitecms/events". */
  endpoint?: string;
};

/**
 * Async serverkomponent. Renderar null i sitecms förhandsgranskning
 * (`isPreview()`), annars klientkomponenten som skickar sidvisningar.
 */
export async function SitecmsAnalytics(props: SitecmsAnalyticsProps = {}) {
  if (await isPreview()) return null;
  return <SitecmsAnalyticsClient endpoint={props.endpoint ?? ANALYTICS_ROUTE_PATH} />;
}
