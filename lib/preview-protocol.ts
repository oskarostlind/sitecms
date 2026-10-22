/**
 * Delade konstanter och typer för live-förhandsgranskningen (docs/LIVE-PREVIEW.md).
 * Ingen import av databas eller Node — används både av servern (lib/preview.ts,
 * API-routes) och av panelens klientkomponent (components/admin/LivePreview.tsx).
 */

/** Header som kundsajten skickar med till content-API:t i draft mode. */
export const PREVIEW_HEADER = "x-sitecms-preview";

/** Rå token: "scp_" + 32 slumpbytes base64url. */
export const PREVIEW_TOKEN_PREFIX = "scp_";

/** Sökvägen på kundsajten som startar förhandsgranskningen (sitecms-next 0.4+). */
export const PREVIEW_ROUTE_PATH = "/api/sitecms/preview";

/** Sessionens livslängd; glidande vid varje setPreviewOverrides. */
export const PREVIEW_TTL_MS = 2 * 60 * 60 * 1000;

/** Gränser för setPreviewOverrides (§3.3). */
export const PREVIEW_MAX_BLOCKS = 200;
export const PREVIEW_MAX_BYTES = 200 * 1024;

/** Felkod i 401-svaret när token saknas i databasen, är utgången eller hör till en annan sajt. */
export const PREVIEW_INVALID_CODE = "preview_invalid";
export const PREVIEW_INVALID_ERROR = "Förhandsgranskningen har gått ut. Öppna den igen i sitecms.";

/** `page` och `key` i data-sitecms="page:key" (§5). */
export const PREVIEW_ID_PATTERN = /^[a-z0-9._-]+$/;

// ---------------------------------------------------------------------------
// postMessage-protokoll v1 (§5)
// ---------------------------------------------------------------------------

export const PANEL_MESSAGE_SOURCE = "sitecms";
export const SITE_MESSAGE_SOURCE = "sitecms-preview";
export const PREVIEW_PROTOCOL_VERSION = 1;

export type PreviewFieldRef = { page: string; key: string };

/** Panel → sajt. */
export type PanelMessage =
  | { type: "refresh" }
  | { type: "patch"; page: string; key: string; kind: "text" | "image"; value: string; alt?: string | null }
  | { type: "highlight"; page: string; key: string }
  | { type: "overlays"; enabled: boolean };

/** Sajt → panel. */
export type SiteMessage =
  | { type: "ready"; path: string; title: string; fields: PreviewFieldRef[] }
  | { type: "refreshed"; path: string }
  | { type: "focus"; page: string; key: string };

/**
 * Tolkar ett inkommande meddelande från iframen. Returnerar null för allt som
 * inte är ett giltigt v1-meddelande från sitecms-next (fel källa, fel version,
 * okänd typ eller ogiltiga fält) — anroparen kontrollerar origin och source.
 */
export function parseSiteMessage(data: unknown): SiteMessage | null {
  if (!data || typeof data !== "object") return null;
  const msg = data as Record<string, unknown>;
  if (msg.source !== SITE_MESSAGE_SOURCE || msg.v !== PREVIEW_PROTOCOL_VERSION) return null;
  const str = (value: unknown, max = 2048) => (typeof value === "string" && value.length <= max ? value : null);

  switch (msg.type) {
    case "ready": {
      const path = str(msg.path) ?? "/";
      const title = str(msg.title, 500) ?? "";
      const fields: PreviewFieldRef[] = [];
      if (Array.isArray(msg.fields)) {
        for (const field of msg.fields.slice(0, 2000)) {
          const page = str((field as Record<string, unknown> | null)?.page, 200);
          const key = str((field as Record<string, unknown> | null)?.key, 200);
          if (page && key && PREVIEW_ID_PATTERN.test(page) && PREVIEW_ID_PATTERN.test(key)) fields.push({ page, key });
        }
      }
      return { type: "ready", path, title, fields };
    }
    case "refreshed":
      return { type: "refreshed", path: str(msg.path) ?? "/" };
    case "focus": {
      const page = str(msg.page, 200);
      const key = str(msg.key, 200);
      if (!page || !key || !PREVIEW_ID_PATTERN.test(page) || !PREVIEW_ID_PATTERN.test(key)) return null;
      return { type: "focus", page, key };
    }
    default:
      return null;
  }
}

/** Kuvert för meddelanden från panelen. */
export function panelEnvelope(message: PanelMessage): PanelMessage & { source: typeof PANEL_MESSAGE_SOURCE; v: 1 } {
  return { ...message, source: PANEL_MESSAGE_SOURCE, v: PREVIEW_PROTOCOL_VERSION };
}

/** Initial sökväg för en sida i panelen: `home` → `/`, annars `/{slug}`. */
export function previewPathForPage(slug: string): string {
  return slug === "home" ? "/" : `/${slug}`;
}

/** iframe-adressen som startar förhandsgranskningen på kundsajten. */
export function previewStartUrl(baseUrl: string, token: string, path: string): string {
  const url = new URL(`${baseUrl.replace(/\/+$/, "")}${PREVIEW_ROUTE_PATH}`);
  url.searchParams.set("token", token);
  url.searchParams.set("path", path.startsWith("/") && !path.startsWith("//") ? path : "/");
  return url.toString();
}
