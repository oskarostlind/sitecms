import { eq } from "drizzle-orm";
import { db, sites } from "@/lib/db";
import { deliverSiteWebhook } from "@/lib/webhook-send";
import { errorForLog } from "@/lib/webhook-url";

const TIMEOUT_MS = 5000;

/**
 * Pings the customer site's revalidate URL (if configured) with the signed
 * webhook (lib/webhook.ts) so a content change in the admin panel shows up
 * on the live site quickly. Sent as soon as a revalidate URL is set — the
 * legacy revalidate secret is included in the body when the site has one,
 * but is no longer required. The outcome is stored on the site
 * (lastWebhookStatus/At/Error) so the panel can show when changes don't
 * reach the site.
 *
 * This is intentionally best-effort: it must never throw, since it always
 * runs right after a successful database write inside a server action. A
 * flaky or misconfigured customer webhook should not block the save.
 */
export async function triggerSiteRevalidation(siteId: string): Promise<void> {
  try {
    const [site] = await db
      .select({
        id: sites.id,
        slug: sites.slug,
        revalidateUrl: sites.revalidateUrl,
        revalidateSecret: sites.revalidateSecret,
      })
      .from(sites)
      .where(eq(sites.id, siteId))
      .limit(1);

    if (!site?.revalidateUrl) {
      // No webhook configured for this site — nothing to do.
      return;
    }

    const result = await deliverSiteWebhook({ ...site, revalidateUrl: site.revalidateUrl }, { timeoutMs: TIMEOUT_MS });
    if (!result.ok) {
      // detail är redan tvättad från URL:er (lib/webhook-http.ts).
      console.warn(`triggerSiteRevalidation: ${site.slug} — ${result.detail}`);
    }
  } catch (err) {
    // Logga aldrig revalidate-URL:en (kan vara en hemlig deploy hook) — errorForLog maskerar URL:er.
    console.error(`triggerSiteRevalidation failed for site ${siteId}: ${errorForLog(err)}`);
  }
}
