import { NextResponse } from "next/server";
import { count, eq } from "drizzle-orm";
import { db, pages, sites } from "@/lib/db";
import { CONTENT_CACHE_HEADERS, type ApiSite } from "@/app/api/v1/_lib/auth";
import { maskRevalidateUrl, redactUrls } from "@/lib/webhook-url";

export type HealthWebhook = {
  /** true när sajten har en revalidate-URL (webhooken skickas). */
  configured: boolean;
  lastStatus: "ok" | "failed" | null;
  lastAt: string | null;
  lastError: string | null;
};

/**
 * Shared body of GET /api/v1/sites/[slug]/health and GET /api/v1/site/health.
 *
 * Svar 200:
 *   { ok: true, site: { name, slug }, pages: number, lastSchemaSyncAt: string | null,
 *     revalidateUrl: string | null,
 *     webhook: { configured, lastStatus: "ok" | "failed" | null, lastAt, lastError } }
 *
 * `revalidateUrl` och `webhook` är additiva fält (äldre klienter ignorerar dem).
 * `revalidateUrl` är maskerad (maskRevalidateUrl): standardsökvägen
 * /api/sitecms/revalidate visas som origin + sökväg, allt annat — t.ex. en
 * deploy hook, som är en hemlighet — som `<origin>/••••`. Hela adressen syns
 * bara för sajtägare i panelen.
 */
export async function healthResponse(site: ApiSite): Promise<Response> {
  const [[pageCount], [siteRow]] = await Promise.all([
    db.select({ n: count() }).from(pages).where(eq(pages.siteId, site.id)),
    db
      .select({
        lastSchemaSyncAt: sites.lastSchemaSyncAt,
        revalidateUrl: sites.revalidateUrl,
        lastWebhookStatus: sites.lastWebhookStatus,
        lastWebhookAt: sites.lastWebhookAt,
        lastWebhookError: sites.lastWebhookError,
      })
      .from(sites)
      .where(eq(sites.id, site.id))
      .limit(1),
  ]);

  const revalidateUrl = maskRevalidateUrl(siteRow?.revalidateUrl);
  const lastStatus = siteRow?.lastWebhookStatus;
  const webhook: HealthWebhook = {
    configured: Boolean(revalidateUrl),
    lastStatus: lastStatus === "ok" || lastStatus === "failed" ? lastStatus : null,
    lastAt: siteRow?.lastWebhookAt ? siteRow.lastWebhookAt.toISOString() : null,
    lastError: siteRow?.lastWebhookError ? redactUrls(siteRow.lastWebhookError) : null,
  };

  return NextResponse.json(
    {
      ok: true,
      site: { name: site.name, slug: site.slug },
      pages: Number(pageCount?.n ?? 0),
      lastSchemaSyncAt: siteRow?.lastSchemaSyncAt ? siteRow.lastSchemaSyncAt.toISOString() : null,
      revalidateUrl,
      webhook,
    },
    { headers: CONTENT_CACHE_HEADERS },
  );
}
