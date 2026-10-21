"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sites } from "@/lib/db/schema";
import { requireSiteOwner } from "@/lib/guard";
import { logActivity } from "@/lib/audit";
import { deliverSiteWebhook } from "@/lib/webhook-send";
import { maskRevalidateUrl, redactUrls } from "@/lib/webhook-url";

const TIMEOUT_MS = 8000;

type CheckResult = { ok: boolean; detail: string };

/**
 * Testar kopplingen till kundsajten: skickar samma signerade webhook till
 * sajtens revalidate-URL som en riktig sparning gör (lib/webhook-send.ts),
 * och förväntar sig 2xx. Ingen revalidate-hemlighet krävs — nyckel-signaturen
 * räcker, och hemligheten följer med i bodyn för äldre integrationer om den
 * finns. Resultatet sparas på sajten (lastConnectionStatus/CheckedAt och,
 * via sändaren, lastWebhookStatus/At/Error), loggas som
 * `sites.connection_check` och visas på integrationssidan via
 * `?check=ok|failed&detail=…`.
 */
export async function checkConnection(siteId: string): Promise<void> {
  const user = await requireSiteOwner(siteId);
  const target = `/admin/sites/${siteId}/integration`;

  const [site] = await db
    .select({
      id: sites.id,
      slug: sites.slug,
      name: sites.name,
      revalidateUrl: sites.revalidateUrl,
      revalidateSecret: sites.revalidateSecret,
    })
    .from(sites)
    .where(eq(sites.id, siteId))
    .limit(1);

  if (!site) {
    redirect("/admin?error=not-found");
  }

  let result: CheckResult;
  if (!site.revalidateUrl) {
    result = { ok: false, detail: "Ingen revalidate-URL är angiven ännu." };
  } else {
    result = await deliverSiteWebhook(
      { id: site.id, slug: site.slug, revalidateUrl: site.revalidateUrl, revalidateSecret: site.revalidateSecret },
      { timeoutMs: TIMEOUT_MS },
    );
  }

  const status = result.ok ? "ok" : "failed";
  // Aktivitetsloggen syns för alla med tillgång till sajten (även redaktörer)
  // — visa bara den maskerade adressen (deploy hooks är hemliga URL:er).
  const shownUrl = maskRevalidateUrl(site.revalidateUrl);
  const detail = redactUrls(result.detail);

  await db
    .update(sites)
    .set({ lastConnectionStatus: status, lastConnectionCheckedAt: new Date() })
    .where(eq(sites.id, siteId));

  await logActivity({
    userId: user.id,
    userEmail: user.email,
    siteId,
    action: "sites.connection_check",
    detail: result.ok
      ? `Testade anslutningen till ${shownUrl} — fungerar (${detail})`
      : `Testade anslutningen${shownUrl ? ` till ${shownUrl}` : ""} — misslyckades: ${detail}`,
  });

  revalidatePath(target);

  const query = new URLSearchParams({ check: status, detail });
  redirect(`${target}?${query.toString()}`);
}
