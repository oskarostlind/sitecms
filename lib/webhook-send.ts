import { eq } from "drizzle-orm";
import { db, apiKeys, sites } from "@/lib/db";
import { buildWebhookRequest } from "@/lib/webhook";

/**
 * Skickar den signerade webhooken (lib/webhook.ts) till en sajts
 * revalidate-URL och sparar utfallet på sajten (lastWebhookStatus/At/Error).
 * Används både när innehåll sparas (lib/revalidate.ts) och av "Testa
 * anslutningen" (lib/actions/integration.ts), så att panelen alltid visar
 * hur det senaste riktiga anropet gick.
 *
 * Kastar aldrig: alla fel blir `{ ok: false, detail }`.
 */

const MAX_DETAIL_LENGTH = 200;

export type WebhookSite = {
  id: string;
  slug: string;
  revalidateUrl: string;
  revalidateSecret: string | null;
};

export type WebhookResult = {
  ok: boolean;
  /** Kort svensk beskrivning ("Svarade HTTP 200." / varför det misslyckades). */
  detail: string;
  /** HTTP-status om sajten svarade. */
  httpStatus?: number;
};

function shorten(value: string): string {
  const oneLine = value.replace(/\s+/g, " ").trim();
  return oneLine.length > MAX_DETAIL_LENGTH ? `${oneLine.slice(0, MAX_DETAIL_LENGTH - 1)}…` : oneLine;
}

/** Svensk, kort beskrivning av varför ett anrop misslyckades. */
function describeFetchError(err: unknown, timeoutMs: number): string {
  if (err instanceof Error) {
    if (err.name === "AbortError" || err.name === "TimeoutError") {
      return `Inget svar inom ${timeoutMs / 1000} sekunder.`;
    }
    const cause = (err as Error & { cause?: { code?: string; message?: string } }).cause;
    const code = cause?.code;
    if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "Domänen hittades inte (DNS).";
    if (code === "ECONNREFUSED") return "Anslutningen nekades.";
    if (code === "ECONNRESET") return "Anslutningen bröts.";
    if ((code && code.startsWith("ERR_TLS")) || code === "CERT_HAS_EXPIRED" || code === "DEPTH_ZERO_SELF_SIGNED_CERT") {
      return "Problem med sajtens TLS-certifikat.";
    }
    return shorten(cause?.message ?? err.message);
  }
  return "Okänt fel.";
}

function describeHttpStatus(status: number, hasCredentials: boolean): string {
  let hint = "";
  if (status === 401 || status === 403) {
    hint = hasCredentials
      ? " Signaturen/nyckeln stämmer inte — kontrollera CMS_API_KEY (eller CMS_REVALIDATE_SECRET för äldre integrationer)."
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

async function recordStatus(siteId: string, result: WebhookResult): Promise<void> {
  try {
    await db
      .update(sites)
      .set({
        lastWebhookStatus: result.ok ? "ok" : "failed",
        lastWebhookAt: new Date(),
        lastWebhookError: result.ok ? null : shorten(result.detail),
      })
      .where(eq(sites.id, siteId));
  } catch (err) {
    console.error(`webhook: kunde inte spara status för sajt ${siteId}:`, err);
  }
}

async function send(site: WebhookSite, timeoutMs: number): Promise<WebhookResult> {
  let url: URL;
  try {
    url = new URL(site.revalidateUrl);
  } catch {
    return { ok: false, detail: "Revalidate-URL:en är inte en giltig adress." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, detail: "Revalidate-URL:en måste börja med https://." };
  }

  const keys = await db.select({ keyHash: apiKeys.keyHash }).from(apiKeys).where(eq(apiKeys.siteId, site.id));
  const request = buildWebhookRequest({
    slug: site.slug,
    secret: site.revalidateSecret,
    keyHashes: keys.map((k) => k.keyHash),
  });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: request.headers,
      body: request.body,
      signal: AbortSignal.timeout(timeoutMs),
      // Följ omdirigeringar som tidigare (t.ex. 308 firma.se → www.firma.se);
      // 307/308 behåller POST + body.
      redirect: "follow",
      cache: "no-store",
    });
    // Läs inte svaret i onödan, men släpp anslutningen.
    res.body?.cancel().catch(() => {});

    if (res.status >= 200 && res.status < 300) {
      return { ok: true, detail: `Svarade HTTP ${res.status}.`, httpStatus: res.status };
    }
    const hasCredentials = keys.length > 0 || Boolean(site.revalidateSecret);
    let detail = describeHttpStatus(res.status, hasCredentials);
    if (res.redirected) {
      detail += " Adressen omdirigerades — ange den slutliga URL:en (t.ex. med www) så att anropet går direkt dit.";
    }
    return { ok: false, detail, httpStatus: res.status };
  } catch (err) {
    return { ok: false, detail: describeFetchError(err, timeoutMs) };
  }
}

/** Skickar webhooken och sparar utfallet på sajten. Kastar aldrig. */
export async function deliverSiteWebhook(site: WebhookSite, options: { timeoutMs: number }): Promise<WebhookResult> {
  let result: WebhookResult;
  try {
    result = await send(site, options.timeoutMs);
  } catch (err) {
    // T.ex. databasfel när nycklarna lästes.
    console.error(`webhook: oväntat fel för sajt ${site.id}:`, err);
    result = { ok: false, detail: "Internt fel när anropet skulle skickas." };
  }
  await recordStatus(site.id, result);
  return result;
}
