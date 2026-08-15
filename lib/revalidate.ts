import { eq } from "drizzle-orm";
import { db, sites } from "@/lib/db";

/**
 * Pings the customer site's on-demand revalidation webhook (if configured)
 * so a content change in the admin panel shows up on the live site quickly.
 *
 * This is intentionally best-effort: it must never throw, since it always
 * runs right after a successful database write inside a server action. A
 * flaky or misconfigured customer webhook should not block the save.
 */
export async function triggerSiteRevalidation(siteId: string): Promise<void> {
  try {
    const [site] = await db
      .select({
        revalidateUrl: sites.revalidateUrl,
        revalidateSecret: sites.revalidateSecret,
      })
      .from(sites)
      .where(eq(sites.id, siteId))
      .limit(1);

    if (!site?.revalidateUrl || !site?.revalidateSecret) {
      // No webhook configured for this site — nothing to do.
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      await fetch(site.revalidateUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: site.revalidateSecret }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err) {
    console.error(`triggerSiteRevalidation failed for site ${siteId}:`, err);
  }
}
