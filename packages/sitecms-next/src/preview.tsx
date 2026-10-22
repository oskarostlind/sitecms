/**
 * Live-förhandsgranskning för Next.js App Router (sitecms-next 0.4).
 *
 *   // app/api/sitecms/preview/route.ts
 *   export { GET } from "sitecms-next/preview";
 *
 *   // app/layout.tsx, sist i <body>
 *   import { SitecmsPreview } from "sitecms-next/preview";
 *   <SitecmsPreview />
 *
 *   // next.config.ts — låt panelen bädda in sajten
 *   import { previewFrameHeaders } from "sitecms-next/preview";
 *   headers: async () => [{ source: "/:path*", headers: previewFrameHeaders() }]
 *
 * Panelen öppnar `/api/sitecms/preview?token=…&path=/` i en iframe. Routen
 * verifierar token mot sitecms, slår på draft mode och sätter cookies som
 * fungerar i en iframe från en annan domän (partitioned, SameSite=None).
 * `getContent()` hämtar då osparade ändringar, och `<SitecmsPreview />`
 * pratar med panelen via postMessage.
 *
 * `next/headers` importeras dynamiskt: modulen går att importera utanför
 * Next (t.ex. i next.config) och statiska sidor förblir statiska.
 */
import {
  DEFAULT_API_URL,
  PREVIEW_COOKIE,
  PREVIEW_HEADER,
  PREVIEW_ORIGIN_COOKIE,
  apiBase,
  isPreview,
} from "./index.js";
import { SitecmsPreviewClient } from "./preview-client.js";

export { isPreview };
export type { SitecmsPreviewClientProps } from "./preview-client.js";

/** Sökvägen som `sitecms-next init` skapar routen på. */
export const PREVIEW_ROUTE_PATH = "/api/sitecms/preview";

/** Nexts draft mode-cookie. */
const BYPASS_COOKIE = "__prerender_bypass";
/** Preview-cookiernas livslängd i sekunder (som sessionen i sitecms). */
const PREVIEW_MAX_AGE = 7200;

// ---------------------------------------------------------------------------
// Meddelandeprotokoll (v1) — typer för den som vill bygga egen klient/panel
// ---------------------------------------------------------------------------

export type PreviewField = { page: string; key: string };

/** Panel → sajt (`source: "sitecms"`). */
export type PreviewPanelMessage = { source: "sitecms"; v: 1 } & (
  | { type: "refresh" }
  | { type: "patch"; page: string; key: string; kind: "text" | "image"; value: string; alt?: string | null }
  | { type: "highlight"; page: string; key: string }
  | { type: "overlays"; enabled: boolean }
);

/** Sajt → panel (`source: "sitecms-preview"`). */
export type PreviewSiteMessage = { source: "sitecms-preview"; v: 1 } & (
  | { type: "ready"; path: string; title: string; fields: PreviewField[] }
  | { type: "refreshed"; path: string }
  | { type: "focus"; page: string; key: string }
);

// ---------------------------------------------------------------------------
// Hjälpfunktioner
// ---------------------------------------------------------------------------

function env(name: string): string {
  return (typeof process !== "undefined" && process.env?.[name]?.trim()) || "";
}

type CookieOptions = {
  name: string;
  value: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "none" | "strict";
  partitioned?: boolean;
  path?: string;
  maxAge?: number;
  expires?: Date;
};

type CookieStoreLike = {
  get(name: string): { value?: string } | undefined;
  set(options: CookieOptions): unknown;
};

type DraftModeLike = { isEnabled: boolean; enable(): void; disable(): void };

/** Det som används från `next/headers`. Värdena kan vara synkrona (Next 14) eller promises (Next 15+). */
export type NextHeadersLike = {
  draftMode: () => unknown;
  cookies: () => unknown;
};

async function loadNextHeaders(): Promise<NextHeadersLike | null> {
  try {
    return (await import("next/headers.js")) as unknown as NextHeadersLike;
  } catch {
    return null;
  }
}

/**
 * Sökvägen att skicka vidare till efter routen: måste börja med `/` men inte
 * `//` eller `/\` (annars `/`), så att routen aldrig blir en öppen redirect.
 * Behåller query och hash.
 */
export function safePreviewPath(raw: string | null | undefined): string {
  const value = (raw ?? "").trim();
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  // Webbläsare tolkar \ som / och kontrolltecken tas bort: "/\evil.se" blir "//evil.se".
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return "/";
  try {
    const base = "http://sitecms.invalid";
    const url = new URL(value, base);
    if (url.origin !== base) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

/** En origin (`https://sitecms.se`) eller null. Accepterar bara http(s) utan sökväg. */
function normalizeOrigin(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    if (url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1" || host === "[::1]";
}

/**
 * http://localhost (dev): cookies utan Secure/Partitioned och SameSite=Lax.
 * `next start` bygger request.url från sin egen adress (localhost) om proxyn
 * inte skickar x-forwarded-proto, så även Host/x-forwarded-host måste vara
 * localhost — annars antas en riktig (https-)sajt bakom proxy.
 */
function isLocalHttp(url: URL, headers: Headers): boolean {
  if (url.protocol !== "http:" || !isLoopbackHost(url.hostname)) return false;
  const hostHeader = (headers.get("x-forwarded-host") ?? headers.get("host") ?? "").split(",")[0].trim();
  if (!hostHeader) return true;
  try {
    return isLoopbackHost(new URL(`http://${hostHeader}`).hostname);
  } catch {
    return false;
  }
}

function cookieAttributes(localDev: boolean): Omit<CookieOptions, "name" | "value"> {
  return localDev
    ? { httpOnly: true, secure: false, sameSite: "lax", path: "/" }
    : { httpOnly: true, secure: true, sameSite: "none", partitioned: true, path: "/" };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const NO_STORE = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };

/** Enkel felsida på svenska. Token ekas aldrig tillbaka. */
function errorPage(status: number, message: string): Response {
  const html = `<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Förhandsgranskningen kunde inte startas</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; box-sizing: border-box;
    font: 15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: #f6f7f9; color: #171717; }
  main { max-width: 440px; background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 24px; }
  h1 { font-size: 17px; margin: 0 0 8px; }
  p { margin: 0; color: #525252; }
  @media (prefers-color-scheme: dark) {
    body { background: #0a0a0a; color: #f5f5f5; }
    main { background: #171717; border-color: #262626; }
    p { color: #a3a3a3; }
  }
</style>
</head>
<body>
<main>
<h1>Förhandsgranskningen kunde inte startas</h1>
<p>${escapeHtml(message)}</p>
</main>
</body>
</html>
`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", ...NO_STORE } });
}

function redirectTo(path: string): Response {
  // Relativ Location: rätt värd även bakom proxy.
  return new Response(null, { status: 307, headers: { Location: path, ...NO_STORE } });
}

// ---------------------------------------------------------------------------
// Route: GET /api/sitecms/preview
// ---------------------------------------------------------------------------

export type PreviewRouteOptions = {
  /** Bas-URL till sitecms. Default CMS_API_URL, annars "https://sitecms.se". */
  apiUrl?: string;
  /** Sajtens slug (valfri, som klienten). Default CMS_SITE om apiKey inte anges. */
  site?: string;
  /** API-nyckel. Default CMS_API_KEY. */
  apiKey?: string;
  /** Egen fetch, t.ex. för tester. Default globalThis.fetch. */
  fetch?: typeof fetch;
  /** Ersätter `next/headers` (för tester). */
  nextHeaders?: () => Promise<NextHeadersLike | null> | NextHeadersLike | null;
};

const MSG_INVALID = "Länken har gått ut eller är ogiltig. Öppna förhandsgranskningen igen i sitecms.";
const MSG_UNREACHABLE = "sitecms gick inte att nå just nu. Försök igen om en stund.";
const MSG_NO_KEY =
  "CMS_API_KEY saknas på sajten. Lägg in den som miljövariabel hos webbhotellet och deploya om.";
const MSG_NO_NEXT = "Routen kräver Next.js App Router (next/headers saknas).";

/**
 * Skapar preview-routen. Utelämnade värden läses från miljön på samma sätt
 * som `createSitecms` (CMS_API_KEY, CMS_API_URL, CMS_SITE).
 *
 * - `GET ?token=<t>&path=<p>` verifierar token mot `{apiBase}/preview`, slår
 *   på draft mode, sätter cookies och skickar vidare (307) till `path`.
 * - `GET ?disable=1&path=<p>` stänger av draft mode, rensar cookies och
 *   skickar vidare till `path`.
 */
export function createPreviewRoute(options: PreviewRouteOptions = {}) {
  return async function GET(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = safePreviewPath(url.searchParams.get("path"));
    const attrs = cookieAttributes(isLocalHttp(url, request.headers));

    const next = await (options.nextHeaders ? options.nextHeaders() : loadNextHeaders());
    if (!next) return errorPage(500, MSG_NO_NEXT);

    if (url.searchParams.has("disable")) {
      const draft = (await next.draftMode()) as DraftModeLike;
      draft.disable();
      const store = (await next.cookies()) as CookieStoreLike;
      // Samma attribut som när de sattes: en partitioned cookie raderas bara
      // av en Set-Cookie som också är partitioned.
      for (const name of [BYPASS_COOKIE, PREVIEW_COOKIE, PREVIEW_ORIGIN_COOKIE]) {
        store.set({ name, value: "", ...attrs, expires: new Date(0) });
      }
      return redirectTo(path);
    }

    const token = url.searchParams.get("token")?.trim() ?? "";
    if (!token || token.length > 512) return errorPage(401, MSG_INVALID);

    const explicitKey = options.apiKey !== undefined;
    const apiKey = (options.apiKey ?? env("CMS_API_KEY")).trim();
    if (!apiKey) return errorPage(500, MSG_NO_KEY);
    const base = apiBase(options.apiUrl ?? env("CMS_API_URL"), options.site ?? (explicitKey ? "" : env("CMS_SITE")));
    const doFetch = options.fetch ?? globalThis.fetch;

    let res: Response;
    try {
      res = await doFetch(`${base}/preview`, {
        headers: { "x-api-key": apiKey, [PREVIEW_HEADER]: token },
        cache: "no-store",
      });
    } catch {
      return errorPage(401, MSG_UNREACHABLE);
    }
    if (!res.ok) return errorPage(401, res.status >= 500 ? MSG_UNREACHABLE : MSG_INVALID);
    const body = (await res.json().catch(() => null)) as { ok?: unknown; panelOrigin?: unknown } | null;
    const panelOrigin = normalizeOrigin(body?.panelOrigin);
    if (body?.ok !== true || !panelOrigin) return errorPage(401, MSG_INVALID);

    const draft = (await next.draftMode()) as DraftModeLike;
    draft.enable();
    const store = (await next.cookies()) as CookieStoreLike;
    // Skriv om Nexts draft mode-cookie så att den skickas i en iframe från en
    // annan domän (samma trick som next-sanity).
    const bypass = store.get(BYPASS_COOKIE)?.value;
    if (bypass) store.set({ name: BYPASS_COOKIE, value: bypass, ...attrs });
    store.set({ name: PREVIEW_COOKIE, value: token, ...attrs, maxAge: PREVIEW_MAX_AGE });
    store.set({ name: PREVIEW_ORIGIN_COOKIE, value: panelOrigin, ...attrs, maxAge: PREVIEW_MAX_AGE });
    return redirectTo(path);
  };
}

/** Preview-routen med standardinställningar (läser CMS_API_KEY, CMS_API_URL, CMS_SITE). */
export const GET = createPreviewRoute();

// ---------------------------------------------------------------------------
// <SitecmsPreview /> — i app/layout.tsx
// ---------------------------------------------------------------------------

export type SitecmsPreviewProps = {
  /** Sökvägen till preview-routen (för "Avsluta"). Default "/api/sitecms/preview". */
  routePath?: string;
};

/**
 * Async serverkomponent. Renderar ingenting om draft mode inte är på (och
 * läser då inga cookies, så statiska sidor förblir statiska). Annars
 * klientkomponenten som pratar med panelen, med panelens origin från cookien.
 */
export async function SitecmsPreview(props: SitecmsPreviewProps = {}) {
  const next = await loadNextHeaders();
  if (!next) return null;
  let panelOrigin: string | null = null;
  try {
    const draft = (await next.draftMode()) as DraftModeLike | null;
    if (!draft?.isEnabled) return null;
    const store = (await next.cookies()) as CookieStoreLike;
    panelOrigin = normalizeOrigin(store.get(PREVIEW_ORIGIN_COOKIE)?.value);
  } catch {
    return null;
  }
  const routePath = safePreviewPath(props.routePath ?? PREVIEW_ROUTE_PATH).replace(/[?#].*$/, "");
  return <SitecmsPreviewClient panelOrigin={panelOrigin} exitHref={`${routePath}?disable=1`} />;
}

// ---------------------------------------------------------------------------
// Frame-headers — i next.config
// ---------------------------------------------------------------------------

const WILDCARD_SOURCE = /^https:\/\/\*\.[a-z0-9-]+(\.[a-z0-9-]+)+(:\d{1,5})?$/i;

/**
 * Headers som låter panelen bädda in sajten i en iframe:
 *
 *   // next.config.ts
 *   async headers() {
 *     return [{ source: "/:path*", headers: previewFrameHeaders() }];
 *   }
 *
 * Default: origin för CMS_API_URL (annars https://sitecms.se) plus
 * https://www.sitecms.se. Ta bort `X-Frame-Options` på sajten — CSP
 * `frame-ancestors` ersätter den.
 */
export function previewFrameHeaders(panelOrigins?: string[]): { key: string; value: string }[] {
  const input =
    panelOrigins ?? [normalizeOrigin(env("CMS_API_URL").replace(/\/+$/, "")) ?? DEFAULT_API_URL, "https://www.sitecms.se"];
  const sources: string[] = [];
  for (const raw of input) {
    const value = String(raw ?? "").trim().replace(/\/+$/, "");
    const source = WILDCARD_SOURCE.test(value) ? value.toLowerCase() : normalizeOrigin(value);
    if (!source) {
      console.warn(`sitecms: previewFrameHeaders hoppar över ${JSON.stringify(raw)} (inte en origin, t.ex. https://sitecms.se).`);
      continue;
    }
    if (!sources.includes(source)) sources.push(source);
  }
  return [{ key: "Content-Security-Policy", value: ["frame-ancestors", "'self'", ...sources].join(" ") }];
}
