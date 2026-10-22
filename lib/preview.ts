import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, inArray, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { blocks, previewSessions, type PreviewOverrides } from "@/lib/db/schema";
import { normalizeDomain, REVALIDATE_PATH } from "@/lib/webhook-url";
import {
  PREVIEW_HEADER,
  PREVIEW_MAX_BLOCKS,
  PREVIEW_MAX_BYTES,
  PREVIEW_TOKEN_PREFIX,
  PREVIEW_TTL_MS,
} from "@/lib/preview-protocol";

/**
 * Live-förhandsgranskning, serversidan (docs/LIVE-PREVIEW.md §2–3).
 *
 * En preview-session är en kortlivad rad i `preview_sessions` som bär panelens
 * osparade ändringar (`overrides`). Kundsajten skickar sessionens token i
 * headern x-sitecms-preview till content-API:t, som då slår ihop ändringarna
 * med det sparade innehållet. Rå token finns bara hos panelen och i kundsajtens
 * cookie — databasen lagrar sha256-hex, precis som API-nycklar och e-posttokens.
 *
 * Inget här kräver inloggning: auth sköts av anroparen (server actions i
 * lib/actions/preview.ts, API-nyckeln i routes). Det gör att samma funktioner
 * kan testas direkt mot databasen (scripts/preview-test.ts).
 */

// ---------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------

const MAX_TOKEN_LENGTH = 200;

export function generatePreviewToken(): string {
  return `${PREVIEW_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function hashPreviewToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

/** true om strängen ser ut som en token (prefix, rimlig längd, base64url). */
export function isPreviewTokenShape(raw: unknown): raw is string {
  return (
    typeof raw === "string" &&
    raw.length <= MAX_TOKEN_LENGTH &&
    raw.startsWith(PREVIEW_TOKEN_PREFIX) &&
    /^[A-Za-z0-9_-]+$/.test(raw.slice(PREVIEW_TOKEN_PREFIX.length))
  );
}

/** Headervärdet, eller null när headern saknas eller är tom (= vanligt svar). */
export function readPreviewHeader(request: Request): string | null {
  const value = request.headers.get(PREVIEW_HEADER)?.trim();
  return value ? value : null;
}

// ---------------------------------------------------------------------------
// Sessioner
// ---------------------------------------------------------------------------

export type PreviewSession = typeof previewSessions.$inferSelect;

/**
 * Giltig session för sajten, eller null om token är fel, utgången eller hör
 * till en annan sajt. Valfritt `userId` begränsar till sessioner som den
 * användaren skapat (server actions).
 */
export async function findValidPreviewSession(
  siteId: string,
  rawToken: string | null | undefined,
  options: { userId?: string; now?: Date } = {},
): Promise<PreviewSession | null> {
  if (!isPreviewTokenShape(rawToken)) return null;
  const now = options.now ?? new Date();
  const [session] = await db
    .select()
    .from(previewSessions)
    .where(
      and(
        eq(previewSessions.tokenHash, hashPreviewToken(rawToken)),
        eq(previewSessions.siteId, siteId),
        gt(previewSessions.expiresAt, now),
        ...(options.userId ? [eq(previewSessions.userId, options.userId)] : []),
      ),
    )
    .limit(1);
  return session ?? null;
}

/**
 * Skapar en session och returnerar den råa token (enda gången den finns).
 * Rensar samtidigt sajtens utgångna sessioner.
 */
export async function createPreviewSession(input: {
  siteId: string;
  userId: string;
  panelOrigin: string;
  now?: Date;
}): Promise<{ token: string; session: PreviewSession }> {
  const now = input.now ?? new Date();
  await db
    .delete(previewSessions)
    .where(and(eq(previewSessions.siteId, input.siteId), lt(previewSessions.expiresAt, now)));

  const token = generatePreviewToken();
  const [session] = await db
    .insert(previewSessions)
    .values({
      siteId: input.siteId,
      userId: input.userId,
      tokenHash: hashPreviewToken(token),
      panelOrigin: input.panelOrigin,
      overrides: { blocks: {} },
      expiresAt: new Date(now.getTime() + PREVIEW_TTL_MS),
    })
    .returning();
  return { token, session };
}

export type PreviewOverrideUpdate = { blockId: string; value: string; alt?: string | null };

export type ReplaceOverridesResult =
  | { ok: true; expiresAt: Date }
  | { ok: false; code: "expired" | "invalid"; error: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Ersätter sessionens osparade ändringar med `updates` (hela mängden, slås
 * inte ihop) och förlänger sessionen 2 h. Kontrollerar att sessionen tillhör
 * användaren och sajten, att varje block tillhör sajten och gränserna (max
 * 200 block, 200 kB).
 */
export async function replacePreviewOverrides(input: {
  siteId: string;
  userId: string;
  token: string;
  updates: unknown;
  now?: Date;
}): Promise<ReplaceOverridesResult> {
  const { updates } = input;
  if (!Array.isArray(updates)) {
    return { ok: false, code: "invalid", error: "Ogiltiga ändringar." };
  }
  if (updates.length > PREVIEW_MAX_BLOCKS) {
    return { ok: false, code: "invalid", error: `För många osparade fält (max ${PREVIEW_MAX_BLOCKS}). Spara först.` };
  }
  let bytes = 0;
  try {
    bytes = new TextEncoder().encode(JSON.stringify(updates)).byteLength;
  } catch {
    return { ok: false, code: "invalid", error: "Ogiltiga ändringar." };
  }
  if (bytes > PREVIEW_MAX_BYTES) {
    return { ok: false, code: "invalid", error: "De osparade ändringarna är för stora för förhandsgranskningen. Spara först." };
  }

  const next: PreviewOverrides = { blocks: {} };
  for (const raw of updates) {
    const update = raw as Partial<PreviewOverrideUpdate> | null;
    if (
      !update ||
      typeof update.blockId !== "string" ||
      !UUID_PATTERN.test(update.blockId) ||
      typeof update.value !== "string" ||
      (update.alt !== undefined && update.alt !== null && typeof update.alt !== "string")
    ) {
      return { ok: false, code: "invalid", error: "Ogiltiga ändringar." };
    }
    next.blocks[update.blockId.toLowerCase()] = { value: update.value, alt: update.alt ?? null };
  }

  const now = input.now ?? new Date();
  const session = await findValidPreviewSession(input.siteId, input.token, { userId: input.userId, now });
  if (!session) {
    return { ok: false, code: "expired", error: "Förhandsgranskningen har gått ut. Den startas om." };
  }

  const blockIds = Object.keys(next.blocks);
  if (blockIds.length > 0) {
    const owned = await db
      .select({ id: blocks.id })
      .from(blocks)
      .where(and(eq(blocks.siteId, input.siteId), inArray(blocks.id, blockIds)));
    if (owned.length !== blockIds.length) {
      return { ok: false, code: "invalid", error: "Ett av fälten finns inte längre. Ladda om sidan." };
    }
  }

  const expiresAt = new Date(now.getTime() + PREVIEW_TTL_MS);
  await db
    .update(previewSessions)
    .set({ overrides: next, expiresAt, updatedAt: now })
    .where(eq(previewSessions.id, session.id));
  return { ok: true, expiresAt };
}

/** Raderar användarens session (Stäng). Okänd token är inget fel. */
export async function deletePreviewSession(input: { siteId: string; userId: string; token: string }): Promise<void> {
  if (!isPreviewTokenShape(input.token)) return;
  await db
    .delete(previewSessions)
    .where(
      and(
        eq(previewSessions.tokenHash, hashPreviewToken(input.token)),
        eq(previewSessions.siteId, input.siteId),
        eq(previewSessions.userId, input.userId),
      ),
    );
}

// ---------------------------------------------------------------------------
// Sammanslagning i content-svaret
// ---------------------------------------------------------------------------

type MergeableBlock = { id: string; type: string; value: string | null; alt: string | null };

/**
 * Lägger sessionens osparade värden över de sparade blocken. `value` ersätts
 * alltid; `alt` bara när override har en alt (string). Ren funktion — html för
 * richtext räknas om av anroparen från det sammanslagna värdet.
 */
export function applyPreviewOverrides<T extends MergeableBlock>(rows: T[], overrides: PreviewOverrides | null | undefined): T[] {
  const map = overrides?.blocks;
  if (!map || Object.keys(map).length === 0) return rows;
  return rows.map((row) => {
    const override = map[row.id.toLowerCase()];
    if (!override) return row;
    return {
      ...row,
      value: override.value,
      ...(typeof override.alt === "string" ? { alt: override.alt } : {}),
    };
  });
}

// ---------------------------------------------------------------------------
// Adresser
// ---------------------------------------------------------------------------

/** "https://x.se/" → "https://x.se" (sökväg behålls, query/fragment tas bort). Null om ogiltig. */
function normalizeBaseUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
  } catch {
    return null;
  }
}

/**
 * Bas-URL som förhandsgranskningen öppnas mot: `preview_url` → `https://{domain}`
 * → origin för `revalidate_url` → null. Revalidate-URL:en används bara när den
 * pekar på sitecms-nexts egen route (/api/sitecms/revalidate) — en deploy hook
 * ligger hos webbhotellet och säger inget om var sajten finns.
 */
export function previewBaseUrl(site: {
  previewUrl?: string | null;
  domain?: string | null;
  revalidateUrl?: string | null;
}): string | null {
  const explicit = normalizeBaseUrl(site.previewUrl);
  if (explicit) return explicit;

  const host = normalizeDomain(site.domain);
  if (host && !/\s/.test(host)) {
    const fromDomain = normalizeBaseUrl(`https://${host}`);
    if (fromDomain) return fromDomain;
  }

  const revalidate = site.revalidateUrl?.trim();
  if (revalidate) {
    try {
      const url = new URL(revalidate);
      if ((url.protocol === "https:" || url.protocol === "http:") && url.pathname.replace(/\/+$/, "") === REVALIDATE_PATH) {
        return url.origin;
      }
    } catch {
      // ogiltig adress — ingen förhandsgranskning härifrån
    }
  }
  return null;
}

export type PreviewUrlProblem = "preview-url-invalid";

export const PREVIEW_URL_ERROR_MESSAGES: Record<PreviewUrlProblem, string> = {
  "preview-url-invalid":
    "Adressen för förhandsgranskning måste börja med https:// (eller http://localhost när du utvecklar), t.ex. https://min-sajt.vercel.app.",
};

/**
 * Validering av "Adress för förhandsgranskning" i Inställningar: https://
 * (vilken värd som helst, t.ex. en branch-URL) eller http://localhost[:port].
 * Inga inloggningsuppgifter, query eller fragment. Null = godkänd.
 */
export function previewUrlProblem(value: string): PreviewUrlProblem | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) return "preview-url-invalid";
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return "preview-url-invalid";
  }
  if (url.username || url.password || url.search || url.hash) return "preview-url-invalid";
  if (url.protocol === "https:") return url.hostname.includes(".") || url.hostname === "localhost" ? null : "preview-url-invalid";
  if (url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) return null;
  return "preview-url-invalid";
}

/** Sparat värde för en godkänd adress: utan avslutande snedstreck. */
export function normalizePreviewUrl(value: string): string {
  return normalizeBaseUrl(value) ?? value.trim();
}

/**
 * Panelens origin från request-headers (x-forwarded-proto/host, annars host).
 * Bestäms alltid på serversidan — klienten får aldrig välja vilken origin
 * kundsajten ska lita på.
 */
export function panelOriginFromHeaders(headers: Pick<Headers, "get">): string | null {
  const first = (value: string | null) => value?.split(",")[0]?.trim() || null;
  const host = first(headers.get("x-forwarded-host")) ?? first(headers.get("host"));
  if (!host || !/^[A-Za-z0-9.-]+(:\d{1,5})?$|^\[[0-9a-fA-F:]+\](:\d{1,5})?$/.test(host)) return null;
  const forwardedProto = first(headers.get("x-forwarded-proto"))?.toLowerCase();
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host);
  const proto = forwardedProto === "http" || forwardedProto === "https" ? forwardedProto : isLocal ? "http" : "https";
  return `${proto}://${host.toLowerCase()}`;
}
