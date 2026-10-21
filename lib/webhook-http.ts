import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { redactUrls } from "@/lib/webhook-url";

/**
 * Nätverksdelen av webhooken till kundsajten (ingen databas — testas i
 * scripts/webhook-send-test.ts). lib/webhook-send.ts bygger anropet och
 * sparar utfallet; här skickas det.
 *
 * SSRF-skydd: revalidate-URL:en skrivs in av sajtägaren, så sitecms får inte
 * kunna användas för att nå interna adresser (molnets metadata-tjänst,
 * localhost, privata nät). Före varje anrop — även efter varje omdirigering —
 * slås värdnamnet upp och avvisas om någon adress är intern.
 *
 * Omdirigeringar följs för hand (max 3) med exakt samma semantik som
 * fetch(..., { redirect: "follow" }) hade tidigare, så att befintliga sajter
 * (t.ex. 308 firma.se → www.firma.se) fungerar som förut:
 *   - 301/302 på POST och 303 → GET utan body (och utan content-type)
 *   - 307/308 → samma metod, body och headers
 *
 * Kvarvarande risk: fetch slår upp namnet igen när den ansluter (DNS-
 * rebinding mellan kontrollen och anslutningen). Det kräver en egen
 * undici-dispatcher att stänga helt.
 */

/** Max antal omdirigeringar som följs. */
export const MAX_WEBHOOK_REDIRECTS = 3;

export const ERROR_INTERNAL = "Revalidate-URL:en pekar på en intern adress.";
export const ERROR_CREDENTIALS = "Revalidate-URL:en får inte innehålla användarnamn eller lösenord.";
export const ERROR_PROTOCOL = "Revalidate-URL:en måste börja med https:// (eller http://).";
export const ERROR_INVALID = "Revalidate-URL:en är inte en giltig adress.";
export const ERROR_TOO_MANY_REDIRECTS = `Adressen omdirigerar fler än ${MAX_WEBHOOK_REDIRECTS} gånger — ange den slutliga URL:en.`;
export const ERROR_BAD_REDIRECT = "Adressen omdirigerar till en ogiltig adress — ange den slutliga URL:en.";

const MAX_DETAIL_LENGTH = 300;

/** Fel vars meddelande är en färdig, säker svensk text för panelen. */
export class WebhookTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookTargetError";
  }
}

// ---------------------------------------------------------------------------
// IP-klassificering
// ---------------------------------------------------------------------------

function parseIPv4(address: string): number[] | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(address);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  return parts.every((p) => p <= 255) ? parts : null;
}

function isInternalIPv4(parts: number[]): boolean {
  const [a, b, c] = parts;
  return (
    a === 0 || // 0.0.0.0/8 (ospecificerad, "denna värd")
    a === 10 || // 10/8 privat
    a === 127 || // 127/8 loopback
    (a === 100 && b >= 64 && b <= 127) || // 100.64/10 CGNAT
    (a === 169 && b === 254) || // 169.254/16 link-local (molnens metadata-tjänst)
    (a === 172 && b >= 16 && b <= 31) || // 172.16/12 privat
    (a === 192 && b === 168) || // 192.168/16 privat
    (a === 192 && b === 0 && c === 0) || // 192.0.0/24 IETF
    (a === 192 && b === 0 && c === 2) || // TEST-NET-1
    (a === 198 && (b === 18 || b === 19)) || // 198.18/15 benchmark
    (a === 198 && b === 51 && c === 100) || // TEST-NET-2
    (a === 203 && b === 0 && c === 113) || // TEST-NET-3
    a >= 224 // 224/4 multicast, 240/4 reserverat, 255.255.255.255
  );
}

/** "fe80::1%eth0" / "::ffff:127.0.0.1" → åtta 16-bitarsgrupper, eller null. */
function parseIPv6(address: string): number[] | null {
  let addr = address.toLowerCase();
  const zone = addr.indexOf("%");
  if (zone !== -1) addr = addr.slice(0, zone);

  // IPv4 i slutet (::ffff:1.2.3.4) → två grupper.
  const lastColon = addr.lastIndexOf(":");
  const tail = addr.slice(lastColon + 1);
  if (tail.includes(".")) {
    const v4 = parseIPv4(tail);
    if (!v4) return null;
    addr = `${addr.slice(0, lastColon + 1)}${((v4[0] << 8) | v4[1]).toString(16)}:${((v4[2] << 8) | v4[3]).toString(16)}`;
  }

  const halves = addr.split("::");
  if (halves.length > 2) return null;
  const parse = (s: string) => (s ? s.split(":") : []);
  const head = parse(halves[0]);
  const rest = halves.length === 2 ? parse(halves[1]) : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 2 ? missing < 1 : missing !== 0) return null;
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...rest];
  if (groups.length !== 8 || !groups.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return null;
  return groups.map((g) => parseInt(g, 16));
}

function embeddedIPv4(g: number[], from: number): number[] {
  return [g[from] >> 8, g[from] & 0xff, g[from + 1] >> 8, g[from + 1] & 0xff];
}

function isInternalIPv6(g: number[]): boolean {
  // ::/96 — ospecificerad (::), loopback (::1) och utfasade IPv4-kompatibla adresser.
  if (g.slice(0, 6).every((x) => x === 0)) return true;
  // ::ffff:0:0/96 IPv4-mappad → bedöm IPv4-adressen.
  if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) return isInternalIPv4(embeddedIPv4(g, 6));
  // 64:ff9b::/96 NAT64 → bedöm IPv4-adressen.
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) return isInternalIPv4(embeddedIPv4(g, 6));
  // 2002::/16 6to4 → bedöm den inbäddade IPv4-adressen.
  if (g[0] === 0x2002) return isInternalIPv4(embeddedIPv4(g, 1));
  if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unik lokal (ULA)
  if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((g[0] & 0xffc0) === 0xfec0) return true; // fec0::/10 site-local (utfasad)
  if ((g[0] & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // 2001:db8::/32 dokumentation
  if (g[0] === 0x0100 && g[1] === 0 && g[2] === 0 && g[3] === 0) return true; // 100::/64 discard
  return false;
}

/**
 * true om adressen (IPv4 eller IPv6, med eller utan hakparenteser) är
 * loopback, privat, link-local, CGNAT, ospecificerad, multicast, ULA eller
 * annars reserverad — eller inte går att tolka (fail closed).
 */
export function isInternalAddress(address: string): boolean {
  const addr = address.trim().replace(/^\[|\]$/g, "");
  const v4 = parseIPv4(addr);
  if (v4) return isInternalIPv4(v4);
  if (addr.includes(":")) {
    const v6 = parseIPv6(addr);
    return v6 ? isInternalIPv6(v6) : true;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Kontroll av mål-URL (före varje anrop och varje omdirigering)
// ---------------------------------------------------------------------------

/** Slår upp alla adresser för ett värdnamn. */
export type HostResolver = (hostname: string) => Promise<string[]>;

export const resolveHostAddresses: HostResolver = async (hostname) => {
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((r) => r.address);
};

/** Kontrollerar ett mål; kastar WebhookTargetError (eller DNS-/timeoutfel). */
export type TargetCheck = (url: URL, signal?: AbortSignal) => Promise<void>;

function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (err) => {
        signal.removeEventListener("abort", onAbort);
        reject(err);
      },
    );
  });
}

/**
 * Kontrollerar att en URL är ett tillåtet webhook-mål: http(s), inga
 * inloggningsuppgifter, och att varken IP-literalen eller någon adress som
 * värdnamnet pekar på är intern.
 */
export async function assertPublicTarget(
  url: URL,
  options: { resolveHost?: HostResolver; signal?: AbortSignal } = {},
): Promise<void> {
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new WebhookTargetError(ERROR_PROTOCOL);
  if (url.username || url.password) throw new WebhookTargetError(ERROR_CREDENTIALS);

  const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
  if (!host) throw new WebhookTargetError(ERROR_INVALID);
  if (isIP(host)) {
    if (isInternalAddress(host)) throw new WebhookTargetError(ERROR_INTERNAL);
    return;
  }
  if (host === "localhost" || host.endsWith(".localhost")) throw new WebhookTargetError(ERROR_INTERNAL);

  const addresses = await abortable((options.resolveHost ?? resolveHostAddresses)(host), options.signal);
  if (addresses.length === 0) {
    throw Object.assign(new Error(`getaddrinfo ENOTFOUND ${host}`), { code: "ENOTFOUND" });
  }
  if (addresses.some((a) => isInternalAddress(a))) throw new WebhookTargetError(ERROR_INTERNAL);
}

const defaultTargetCheck: TargetCheck = (url, signal) => assertPublicTarget(url, { signal });

// ---------------------------------------------------------------------------
// Anrop med egna omdirigeringar
// ---------------------------------------------------------------------------

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
/** Fetch-specens "request-body-header names" — tas bort när en omdirigering gör om anropet till GET. */
const REQUEST_BODY_HEADERS = ["content-encoding", "content-language", "content-location", "content-type"];
/** Tas bort vid omdirigering till en annan origin (som fetch gör). */
const CROSS_ORIGIN_STRIPPED_HEADERS = ["authorization", "proxy-authorization", "cookie", "host"];

export type WebhookHttpRequest = {
  method?: string;
  headers: Record<string, string>;
  body?: string;
};

export type WebhookHttpOptions = {
  timeoutMs: number;
  maxRedirects?: number;
  /** Kontroll av varje mål (default: DNS + IP-kontroll). Injicerbar för tester. */
  checkTarget?: TargetCheck;
  /** Injicerbar för tester. */
  fetchImpl?: typeof fetch;
};

export type WebhookHttpResponse = {
  response: Response;
  /** true om minst en omdirigering följdes. */
  redirected: boolean;
  /** Slutlig URL (efter omdirigeringar). */
  url: URL;
};

function withoutHeaders(headers: Record<string, string>, names: readonly string[]): Record<string, string> {
  const drop = new Set(names);
  return Object.fromEntries(Object.entries(headers).filter(([name]) => !drop.has(name.toLowerCase())));
}

/**
 * Skickar anropet och följer upp till `maxRedirects` omdirigeringar själv,
 * med samma semantik som fetch-follow. Varje mål kontrolleras innan det
 * anropas. Timeouten gäller hela kedjan (DNS, alla hopp), som tidigare.
 * Kastar WebhookTargetError, DNS-/nätverksfel eller timeout (TimeoutError).
 */
export async function sendWebhookHttp(
  target: URL,
  request: WebhookHttpRequest,
  options: WebhookHttpOptions,
): Promise<WebhookHttpResponse> {
  const signal = AbortSignal.timeout(options.timeoutMs);
  const checkTarget = options.checkTarget ?? defaultTargetCheck;
  const doFetch = options.fetchImpl ?? fetch;
  const maxRedirects = options.maxRedirects ?? MAX_WEBHOOK_REDIRECTS;

  let url = target;
  let method = (request.method ?? "POST").toUpperCase();
  let body = request.body;
  let headers = { ...request.headers };

  for (let hop = 0; ; hop++) {
    // Protokoll och inloggningsuppgifter kontrolleras alltid här (oberoende av
    // den injicerbara kontrollen) — fetch skulle annars kasta ett fel som
    // innehåller hela URL:en.
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new WebhookTargetError(ERROR_PROTOCOL);
    if (url.username || url.password) throw new WebhookTargetError(ERROR_CREDENTIALS);
    await checkTarget(url, signal);

    const response = await doFetch(url, {
      method,
      headers,
      body,
      signal,
      redirect: "manual",
      // Ingen cache-option: som det ursprungliga anropet (POST cachas aldrig),
      // och så att headers blir exakt desamma som förut.
    });

    const location = REDIRECT_STATUSES.has(response.status) ? response.headers.get("location") : null;
    // Ingen Location → svaret returneras som det är (som fetch gör).
    if (location === null) return { response, redirected: hop > 0, url };

    response.body?.cancel().catch(() => {});

    if (hop >= maxRedirects) throw new WebhookTargetError(ERROR_TOO_MANY_REDIRECTS);

    let next: URL;
    try {
      next = new URL(location, url);
    } catch {
      throw new WebhookTargetError(ERROR_BAD_REDIRECT);
    }

    const status = response.status;
    if (((status === 301 || status === 302) && method === "POST") || (status === 303 && method !== "GET" && method !== "HEAD")) {
      method = "GET";
      body = undefined;
      headers = withoutHeaders(headers, REQUEST_BODY_HEADERS);
    }
    if (next.origin !== url.origin) headers = withoutHeaders(headers, CROSS_ORIGIN_STRIPPED_HEADERS);
    // 307/308: samma metod, body och headers.
    url = next;
  }
}

// ---------------------------------------------------------------------------
// Utfall → kort svensk text för panelen
// ---------------------------------------------------------------------------

export type WebhookResult = {
  ok: boolean;
  /** Kort svensk beskrivning ("Svarade HTTP 200." / varför det misslyckades). Innehåller aldrig hela URL:er. */
  detail: string;
  /** HTTP-status om sajten svarade. */
  httpStatus?: number;
};

/** En rad, tvättad från URL:er, max 300 tecken. */
export function cleanDetail(value: string): string {
  const oneLine = redactUrls(value).replace(/\s+/g, " ").trim();
  return oneLine.length > MAX_DETAIL_LENGTH ? `${oneLine.slice(0, MAX_DETAIL_LENGTH - 1)}…` : oneLine;
}

type ErrorWithCode = Error & { code?: string; cause?: { code?: string; message?: string } };

/** Svensk, kort beskrivning av varför ett anrop misslyckades. Läcker aldrig URL:en. */
export function describeFetchError(err: unknown, timeoutMs: number): string {
  if (err instanceof WebhookTargetError) return err.message;
  if (err instanceof Error) {
    if (err.name === "AbortError" || err.name === "TimeoutError") {
      return `Inget svar inom ${timeoutMs / 1000} sekunder.`;
    }
    const e = err as ErrorWithCode;
    const code = e.cause?.code ?? e.code;
    if (code === "ENOTFOUND" || code === "EAI_AGAIN" || code === "ENODATA") return "Domänen hittades inte (DNS).";
    if (code === "ECONNREFUSED") return "Anslutningen nekades.";
    if (code === "ECONNRESET") return "Anslutningen bröts.";
    if (code === "ETIMEDOUT" || code === "UND_ERR_CONNECT_TIMEOUT") return "Anslutningen tog för lång tid.";
    if ((code && code.startsWith("ERR_TLS")) || code === "CERT_HAS_EXPIRED" || code === "DEPTH_ZERO_SELF_SIGNED_CERT") {
      return "Problem med sajtens TLS-certifikat.";
    }
    return cleanDetail(e.cause?.message ?? err.message);
  }
  return "Okänt fel.";
}

/** sitecms-next 0.3: `401 { reason: "timestamp-out-of-range" }` när bara tidsstämpeln avvisades. */
export const REASON_TIMESTAMP = "timestamp-out-of-range";
export const HINT_CLOCK =
  " Kundsajtens klocka går fel (mer än 5 min) — signaturen stämmer men tidsstämpeln avvisades.";

/** Max antal bytes av ett felsvar som läses (för `reason`). */
const MAX_ERROR_BODY_BYTES = 2048;

/** Läser högst `max` bytes av svaret som text; släpper resten. Kastar aldrig. */
async function readBodyPrefix(response: Response, max = MAX_ERROR_BODY_BYTES): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (size < max) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.byteLength;
    }
  } catch {
    // Avbrutet/timeout — använd det som hann läsas.
  } finally {
    reader.cancel().catch(() => {});
  }
  const bytes = new Uint8Array(Math.min(size, max));
  let offset = 0;
  for (const chunk of chunks) {
    const part = chunk.subarray(0, bytes.length - offset);
    bytes.set(part, offset);
    offset += part.length;
    if (offset >= bytes.length) break;
  }
  return new TextDecoder().decode(bytes);
}

/** `reason` ur ett JSON-felsvar (`{ revalidated: false, error, reason }`), annars null. Tålig mot icke-JSON. */
export function errorReasonFromBody(text: string): string | null {
  try {
    const parsed: unknown = JSON.parse(text);
    const reason = parsed && typeof parsed === "object" ? (parsed as { reason?: unknown }).reason : undefined;
    return typeof reason === "string" && reason ? reason : null;
  } catch {
    return null;
  }
}

export function describeHttpStatus(status: number, hasCredentials: boolean, reason: string | null = null): string {
  let hint = "";
  if (status === 401 && reason === REASON_TIMESTAMP) {
    hint = HINT_CLOCK;
  } else if (status === 401 || status === 403) {
    hint = hasCredentials
      ? " Signaturen/nyckeln stämmer inte — kontrollera CMS_API_KEY (eller CMS_REVALIDATE_SECRET för äldre integrationer). Det kan också bero på att kundsajtens klocka går fel med mer än 5 minuter."
      : " Sajten har varken API-nyckel eller revalidate-hemlighet i sitecms — skapa en API-nyckel och sätt den som CMS_API_KEY.";
  } else if (status === 404) {
    hint = " Routen finns inte — har app/api/sitecms/revalidate/route.ts deployats?";
  } else if (status === 405) {
    hint = " Routen tar inte emot POST.";
  } else if (status >= 300 && status < 400) {
    hint = " Adressen omdirigerar — ange den slutliga URL:en (t.ex. med www eller https).";
  } else if (status >= 500) {
    hint = " Felet uppstod på kundsajten — kolla dess loggar.";
  }
  return `Svarade HTTP ${status}.${hint}`;
}

/**
 * Skickar ett färdigbyggt webhook-anrop (body + headers från lib/webhook.ts)
 * och beskriver utfallet. Kastar aldrig.
 */
export async function postWebhook(
  revalidateUrl: string,
  request: { body: string; headers: Record<string, string> },
  options: { timeoutMs: number; hasCredentials: boolean; checkTarget?: TargetCheck; fetchImpl?: typeof fetch },
): Promise<WebhookResult> {
  let url: URL;
  try {
    url = new URL(revalidateUrl.trim());
  } catch {
    return { ok: false, detail: ERROR_INVALID };
  }
  // Inloggningsuppgifter avvisas innan något skickas (och innan URL:en kan hamna i ett felmeddelande).
  if (url.username || url.password) return { ok: false, detail: ERROR_CREDENTIALS };
  if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, detail: ERROR_PROTOCOL };

  try {
    const { response, redirected } = await sendWebhookHttp(
      url,
      { method: "POST", headers: request.headers, body: request.body },
      { timeoutMs: options.timeoutMs, checkTarget: options.checkTarget, fetchImpl: options.fetchImpl },
    );
    if (response.status >= 200 && response.status < 300) {
      // Läs inte svaret i onödan, men släpp anslutningen.
      response.body?.cancel().catch(() => {});
      return { ok: true, detail: `Svarade HTTP ${response.status}.`, httpStatus: response.status };
    }
    // Felsvar: läs högst 2 KB för sitecms-nexts `reason` (t.ex. klockfel).
    const reason = errorReasonFromBody(await readBodyPrefix(response));
    let detail = describeHttpStatus(response.status, options.hasCredentials, reason);
    if (redirected) {
      detail += " Adressen omdirigerades — ange den slutliga URL:en (t.ex. med www) så att anropet går direkt dit.";
    }
    return { ok: false, detail: cleanDetail(detail), httpStatus: response.status };
  } catch (err) {
    return { ok: false, detail: describeFetchError(err, options.timeoutMs) };
  }
}
