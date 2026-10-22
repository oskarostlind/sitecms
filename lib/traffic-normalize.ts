/**
 * Rena hjälpfunktioner för trafikpixeln (docs/SEO-TRAFIK.md §2–3).
 *
 * Ingen databas, inga Next-beroenden — allt här går att köra med
 * `tsx scripts/traffic-test.ts`. Här normaliseras inkommande events till det
 * enda som någonsin lagras: sökväg, källa, land, enhet och en dagsbunden
 * besökarhash. IP och user agent lämnar aldrig den här modulen.
 */
import { createHash } from "node:crypto";
import { classifyReferrer } from "./attribution";

export type TrafficDevice = "mobile" | "tablet" | "desktop";

/** Det som lagras per sidvisning (aggregerat). Aldrig IP, UA eller tidsstämpel. */
export type NormalizedEvent = {
  path: string;
  source: string;
  country: string;
  device: TrafficDevice;
  visitorHash: string;
};

/** Ett event som kundsajtens route skickar (alla fält utom `p` är valfria). */
export type RawEvent = {
  p?: unknown;
  r?: unknown;
  q?: unknown;
  ua?: unknown;
  ip?: unknown;
  c?: unknown;
  t?: unknown;
};

export type NormalizeContext = {
  siteId: string;
  /** Sajtens domän (sites.domain) — referer från egen domän räknas som direkt. */
  domain: string | null;
  /** UTC-dag `YYYY-MM-DD` som hashen binds till. */
  day: string;
  /** Salt för besökarhashen (`analyticsSalt()`). */
  salt: string;
  /** IP från anropet, används när eventet saknar `ip`. */
  fallbackIp?: string | null;
};

export type NormalizeResult =
  | { ok: true; events: NormalizedEvent[] }
  | { ok: false; error: string };

/** Max antal events per anrop (§3). */
export const MAX_EVENTS_PER_REQUEST = 20;
/** Max längd på `p` innan normalisering (§3). */
export const MAX_RAW_PATH_LENGTH = 2048;
/** Max längd på lagrad sökväg (§2). */
export const MAX_PATH_LENGTH = 200;
/** Max längd på lagrad källa (som lib/attribution). */
export const MAX_SOURCE_LENGTH = 80;
/** Sökvägen som bokförs när sajten passerat 500 distinkta sökvägar på en dag. */
export const OVERFLOW_PATH = "/…";

const BOT_RE = /crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|curl|wget|python|node-fetch|go-http/i;
/**
 * "bot" som ordslut med gemener (Googlebot, bingbot, YandexBot, /bot.html) —
 * men inte versalt BOT inuti ett modellnamn (telefonen CUBOT) och inte
 * "Botswana"/"Abbott". Därför skiftlägeskänslig, till skillnad från BOT_RE.
 */
const BOT_WORD_RE = /[bB]ot(?![A-Za-z])/;

// ---------------------------------------------------------------------------
// Dagar (UTC)
// ---------------------------------------------------------------------------

/** UTC-dagen som `YYYY-MM-DD`. */
export function utcDay(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** `day` ± n dagar, fortfarande `YYYY-MM-DD`. */
export function shiftDay(day: string, deltaDays: number): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

/** Alla dagar från `from` till och med `to`. */
export function dayRange(from: string, to: string): string[] {
  const days: string[] = [];
  for (let day = from; day <= to; day = shiftDay(day, 1)) {
    days.push(day);
    if (days.length > 400) break; // skyddsnät mot felvända intervall
  }
  return days;
}

// ---------------------------------------------------------------------------
// Normalisering
// ---------------------------------------------------------------------------

/**
 * Sökvägen utan query/hash, alltid med inledande `/`, utan avslutande `/`
 * (utom roten), utan dubbla snedstreck, max 200 tecken. Ogiltigt → `/`.
 */
export function normalizePath(raw: unknown): string {
  if (typeof raw !== "string") return "/";
  let value = raw.trim();
  if (!value || value.length > MAX_RAW_PATH_LENGTH) return "/";
  // Fullständig URL → bara pathname.
  if (/^https?:\/\//i.test(value)) {
    try {
      value = new URL(value).pathname;
    } catch {
      return "/";
    }
  }
  value = value.replace(/[?#].*$/, "");
  // Kontrolltecken och backslash hör inte hemma i en sökväg.
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return "/";
  if (!value.startsWith("/")) value = `/${value}`;
  value = value.replace(/\/{2,}/g, "/");
  if (value.length > 1) value = value.replace(/\/+$/, "");
  if (value.length > MAX_PATH_LENGTH) value = value.slice(0, MAX_PATH_LENGTH);
  return value || "/";
}

function hostOf(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function stripWww(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

/** true när referer-värden är sajtens egen domän (eller en underdomän till den). */
export function isOwnHost(refHost: string, domain: string | null | undefined): boolean {
  if (!domain) return false;
  const own = stripWww(domain.trim().replace(/^https?:\/\//, "").replace(/[/:].*$/, ""));
  if (!own) return false;
  const ref = stripWww(refHost);
  return ref === own || ref.endsWith(`.${own}`);
}

/**
 * Källa (§2): `utm:<utm_source>` om querysträngen har utm_source, annars
 * `direkt` när referer saknas/är egen domän, annars `classifyReferrer(host)`.
 */
export function classifySource(referrer: unknown, query: unknown, domain: string | null | undefined): string {
  if (typeof query === "string" && query) {
    try {
      const params = new URLSearchParams(query.replace(/^\?/, ""));
      const utm = params.get("utm_source")?.trim().toLowerCase();
      if (utm) return `utm:${utm}`.slice(0, MAX_SOURCE_LENGTH);
    } catch {
      // Trasig query → ignorera, gå vidare på referer.
    }
  }
  if (typeof referrer !== "string" || !referrer.trim()) return "direkt";
  const host = hostOf(referrer.trim());
  if (!host) return "direkt";
  if (isOwnHost(host, domain)) return "direkt";
  return classifyReferrer(host).slice(0, MAX_SOURCE_LENGTH);
}

/** `mobile` | `tablet` | `desktop` från user agent. Okänt → desktop. */
export function classifyDevice(ua: unknown): TrafficDevice {
  if (typeof ua !== "string" || !ua) return "desktop";
  if (/ipad|tablet|kindle|silk|playbook|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android|windows phone|blackberry|opera mini|iemobile/i.test(ua)) return "mobile";
  return "desktop";
}

/** Tom UA eller känd robot/verktyg → ska inte räknas (§3). */
export function isBot(ua: unknown): boolean {
  if (typeof ua !== "string") return true;
  const value = ua.trim();
  if (!value) return true;
  return BOT_RE.test(value) || BOT_WORD_RE.test(value);
}

/** ISO 3166-1 alpha-2 i versaler, annars `ZZ`. */
export function normalizeCountry(raw: unknown): string {
  if (typeof raw !== "string") return "ZZ";
  const value = raw.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(value) ? value : "ZZ";
}

/**
 * `sha256("${salt}:${day}:${siteId}:${ip}:${ua}")` i hex. Dagen ingår, så
 * samma besökare får en ny hash i morgon — ingen spårning över tid.
 */
export function visitorHash(salt: string, day: string, siteId: string, ip: string, ua: string): string {
  return createHash("sha256").update(`${salt}:${day}:${siteId}:${ip}:${ua}`).digest("hex");
}

let saltWarned = false;

/**
 * Saltet för besökarhashen: `ANALYTICS_SALT`, annars `AUTH_SECRET`. Saknas
 * båda kastar vi i produktion (hashen får inte vara gissningsbar); i dev/test
 * används `dev-salt` med en varning.
 */
export function analyticsSalt(env: Record<string, string | undefined> = process.env): string {
  const salt = env.ANALYTICS_SALT?.trim() || env.AUTH_SECRET?.trim();
  if (salt) return salt;
  if (env.NODE_ENV === "production") {
    throw new Error("traffic: ANALYTICS_SALT (eller AUTH_SECRET) måste vara satt för besökarhashen.");
  }
  if (!saltWarned) {
    saltWarned = true;
    console.warn("traffic: ANALYTICS_SALT/AUTH_SECRET saknas — använder \"dev-salt\" (bara ok lokalt).");
  }
  return "dev-salt";
}

function optionalString(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * Validerar en request-body enligt §3 och normaliserar varje event. Robotar
 * och events utan användbar UA filtreras bort tyst — en tom lista är ett
 * giltigt resultat (routen svarar 204 ändå). Fel i formen ger `ok: false`
 * med ett svenskt felmeddelande (→ 400).
 */
export function normalizeEvents(raw: unknown, ctx: NormalizeContext): NormalizeResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Body måste vara ett JSON-objekt med fältet events." };
  }
  const list = (raw as { events?: unknown }).events;
  if (!Array.isArray(list) || list.length === 0) {
    return { ok: false, error: "events måste vara en lista med minst ett event." };
  }
  if (list.length > MAX_EVENTS_PER_REQUEST) {
    return { ok: false, error: `events får innehålla högst ${MAX_EVENTS_PER_REQUEST} objekt.` };
  }

  const events: NormalizedEvent[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { ok: false, error: "Varje event måste vara ett objekt." };
    }
    const ev = item as RawEvent;
    if (typeof ev.p !== "string" || !ev.p.trim() || ev.p.length > MAX_RAW_PATH_LENGTH) {
      return { ok: false, error: "Varje event måste ha fältet p (sökväg, sträng på högst 2048 tecken)." };
    }
    for (const key of ["r", "q", "ua", "ip", "c"] as const) {
      if (ev[key] !== undefined && ev[key] !== null && typeof ev[key] !== "string") {
        return { ok: false, error: `Fältet ${key} måste vara en sträng.` };
      }
    }
    if (ev.t !== undefined && ev.t !== null && typeof ev.t !== "number") {
      return { ok: false, error: "Fältet t måste vara ett tal (ms)." };
    }
    // `t` används inte: dagen är alltid serverns UTC-dag (§3).

    const ua = optionalString(ev.ua, 1000);
    if (isBot(ua)) continue;
    const ip = optionalString(ev.ip, 100) || (ctx.fallbackIp ?? "").trim();

    events.push({
      path: normalizePath(ev.p),
      source: classifySource(ev.r, ev.q, ctx.domain),
      country: normalizeCountry(ev.c),
      device: classifyDevice(ua),
      visitorHash: visitorHash(ctx.salt, ctx.day, ctx.siteId, ip, ua),
    });
  }
  return { ok: true, events };
}
