import { eq } from "drizzle-orm";
import { db, apiKeys, sites } from "@/lib/db";
import { buildWebhookRequest } from "@/lib/webhook";
import { cleanDetail, postWebhook, type WebhookResult } from "@/lib/webhook-http";
import { errorForLog } from "@/lib/webhook-url";

export type { WebhookResult } from "@/lib/webhook-http";

/**
 * Skickar den signerade webhooken (lib/webhook.ts) till en sajts
 * revalidate-URL och sparar utfallet på sajten (lastWebhookStatus/At/Error).
 * Används både när innehåll sparas (lib/revalidate.ts) och av "Testa
 * anslutningen" (lib/actions/integration.ts), så att panelen alltid visar
 * hur det senaste riktiga anropet gick.
 *
 * Själva anropet — SSRF-kontroll (DNS/IP), egna omdirigeringar med samma
 * semantik som fetch-follow, timeout och felbeskrivning — finns i
 * lib/webhook-http.ts. Felbeskrivningen (`detail`) tvättas från URL:er innan
 * den sparas, loggas eller visas.
 *
 * Kastar aldrig: alla fel blir `{ ok: false, detail }`.
 */

export type WebhookSite = {
  id: string;
  slug: string;
  revalidateUrl: string;
  revalidateSecret: string | null;
};

async function recordStatus(siteId: string, result: WebhookResult): Promise<void> {
  try {
    await db
      .update(sites)
      .set({
        lastWebhookStatus: result.ok ? "ok" : "failed",
        lastWebhookAt: new Date(),
        lastWebhookError: result.ok ? null : cleanDetail(result.detail),
      })
      .where(eq(sites.id, siteId));
  } catch (err) {
    console.error(`webhook: kunde inte spara status för sajt ${siteId}: ${errorForLog(err)}`);
  }
}

async function send(site: WebhookSite, timeoutMs: number): Promise<WebhookResult> {
  const keys = await db.select({ keyHash: apiKeys.keyHash }).from(apiKeys).where(eq(apiKeys.siteId, site.id));
  const request = buildWebhookRequest({
    slug: site.slug,
    secret: site.revalidateSecret,
    keyHashes: keys.map((k) => k.keyHash),
  });
  const hasCredentials = keys.length > 0 || Boolean(site.revalidateSecret);
  return postWebhook(site.revalidateUrl, request, { timeoutMs, hasCredentials });
}

/** Skickar webhooken och sparar utfallet på sajten. Kastar aldrig. */
export async function deliverSiteWebhook(site: WebhookSite, options: { timeoutMs: number }): Promise<WebhookResult> {
  let result: WebhookResult;
  try {
    result = await send(site, options.timeoutMs);
  } catch (err) {
    // T.ex. databasfel när nycklarna lästes.
    console.error(`webhook: oväntat fel för sajt ${site.id}: ${errorForLog(err)}`);
    result = { ok: false, detail: "Internt fel när anropet skulle skickas." };
  }
  result = { ...result, detail: cleanDetail(result.detail) };
  await recordStatus(site.id, result);
  return result;
}
