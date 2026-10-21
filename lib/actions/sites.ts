"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKeys, memberships, pages, sites } from "@/lib/db/schema";
import { requireUser, requireSiteOwner } from "@/lib/guard";
import { logActivity } from "@/lib/audit";
import { slugify } from "@/components/content/slugify";
import { apiKeyColumns, generateApiKey } from "@/lib/api-keys";
import { setReveal } from "@/lib/reveal-flash";
import { revalidateUrlForDomain } from "@/lib/webhook-url";

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** 48 hex characters (24 random bytes) for the higher-value revalidate secret. */
function generateRevalidateSecret(): string {
  return randomBytes(24).toString("hex");
}

/** Finds a site slug that is free, appending -2, -3, ... on collision. */
async function uniqueSiteSlug(base: string, excludeId?: string): Promise<string> {
  let candidate = base;
  let attempt = 2;

  for (;;) {
    const conflicts = await db
      .select({ id: sites.id })
      .from(sites)
      .where(eq(sites.slug, candidate))
      .limit(1);

    if (conflicts.length === 0 || conflicts[0].id === excludeId) {
      return candidate;
    }

    candidate = `${base}-${attempt}`;
    attempt += 1;
  }
}

/**
 * Where the site-settings actions redirect back to. Forms on the integration
 * page send a hidden `returnTo=integration`; everything else keeps going to
 * /installningar. Only known sub-pages are accepted (no open redirect).
 */
function settingsPath(siteId: string, formData?: FormData): string {
  const returnTo = formData ? readString(formData, "returnTo") : "";
  const section = returnTo === "integration" ? "integration" : "installningar";
  return `/admin/sites/${siteId}/${section}`;
}

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, value);
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

/**
 * Creates a new tenant site: the site row itself, a default "home" page, and
 * one API key. When a domain is given, the revalidate URL is set right away to
 * https://<domain>/api/sitecms/revalidate (what `npx sitecms-next init`
 * creates), so content changes reach the site without a manual step. No
 * revalidate secret is generated any more — the webhook is signed with the
 * site's API keys (lib/webhook.ts). Any logged-in user may create a site (self-service) and
 * becomes its owner via an owner-membership. The freshly created API key is
 * handed to /admin/sites/new through the encrypted one-time reveal cookie
 * (never the URL) so the page can show it exactly once; only its hash is
 * stored.
 */
export async function createSite(formData: FormData): Promise<void> {
  const user = await requireUser();

  const name = readString(formData, "name");
  const slugInput = readString(formData, "slug");
  const domain = readString(formData, "domain") || null;

  if (!name) {
    redirect("/admin/sites/new?error=missing");
  }

  const baseSlug = slugify(slugInput || name);
  if (!baseSlug) {
    redirect("/admin/sites/new?error=invalid-slug");
  }
  const slug = await uniqueSiteSlug(baseSlug);

  const revalidateUrl = revalidateUrlForDomain(domain);

  const [site] = await db
    .insert(sites)
    .values({ name, slug, domain, revalidateUrl, createdByUserId: user.id })
    .returning();

  // The creator owns the site. Admins already see every site; the membership
  // is still written so ownership survives a later role change.
  await db.insert(memberships).values({ userId: user.id, siteId: site.id, role: "owner" });

  await db.insert(pages).values({
    siteId: site.id,
    slug: "home",
    title: "Startsida",
    sortOrder: 0,
  });

  const apiKeyValue = generateApiKey();
  await db.insert(apiKeys).values({
    siteId: site.id,
    ...apiKeyColumns(apiKeyValue),
    name: "Standardnyckel",
  });

  await logActivity({
    userId: user.id,
    userEmail: user.email,
    siteId: site.id,
    action: "sites.create",
    detail: `Skapade sajten "${name}"`,
  });

  // Sidomenyns sajtväljare (AdminShell) läser sajtlistan från layouten —
  // se till att den är färsk nästa gång admin-trädet renderas.
  revalidatePath("/admin", "layout");

  await setReveal({ scope: "new-site", siteId: site.id, siteName: name, apiKey: apiKeyValue });

  redirect(
    `/admin/sites/new${buildQuery({
      created: "1",
      siteId: site.id,
    })}`,
  );
}

/**
 * Updates the editable settings for a site (name, domain, revalidate URL,
 * notify e-mail). Only fields that are present in the submitted form are
 * written, so a form that edits a subset (e.g. the revalidate URL on the
 * integration page) never blanks the others.
 *
 * When the domain goes from empty to a value and no revalidate URL is set
 * (neither in the form nor on the site), the standard
 * https://<domain>/api/sitecms/revalidate is filled in. An existing revalidate
 * URL is never overwritten automatically.
 */
export async function updateSiteSettings(siteId: string, formData: FormData): Promise<void> {
  const user = await requireSiteOwner(siteId);

  const name = readString(formData, "name");
  const domain = readString(formData, "domain") || null;
  let revalidateUrl = readString(formData, "revalidateUrl") || null;
  const notifyEmail = readString(formData, "notifyEmail") || null;

  if (!name) {
    redirect(`${settingsPath(siteId, formData)}?error=missing`);
  }
  if (notifyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmail)) {
    redirect(`${settingsPath(siteId, formData)}?error=notify-email`);
  }

  const [current] = await db
    .select({ domain: sites.domain, revalidateUrl: sites.revalidateUrl })
    .from(sites)
    .where(eq(sites.id, siteId))
    .limit(1);

  const hasDomainField = formData.has("domain");
  const hasRevalidateField = formData.has("revalidateUrl");

  let autoRevalidateUrl = false;
  if (
    hasDomainField &&
    domain &&
    !current?.domain?.trim() &&
    !revalidateUrl &&
    !current?.revalidateUrl?.trim()
  ) {
    const suggested = revalidateUrlForDomain(domain);
    if (suggested) {
      revalidateUrl = suggested;
      autoRevalidateUrl = true;
    }
  }

  const update: Partial<typeof sites.$inferInsert> = { name, updatedAt: new Date() };
  if (hasDomainField) update.domain = domain;
  if (hasRevalidateField || autoRevalidateUrl) update.revalidateUrl = revalidateUrl;
  if (formData.has("notifyEmail")) update.notifyEmail = notifyEmail;

  await db.update(sites).set(update).where(eq(sites.id, siteId));

  await logActivity({
    userId: user.id,
    userEmail: user.email,
    siteId,
    action: "sites.update",
    detail: autoRevalidateUrl
      ? `Uppdaterade inställningarna för "${name}" (revalidate-URL satt till ${revalidateUrl})`
      : `Uppdaterade inställningarna för "${name}"`,
  });

  revalidatePath(`/admin/sites/${siteId}`, "layout");
  revalidatePath("/admin", "layout");

  redirect(`${settingsPath(siteId, formData)}?success=1`);
}

/**
 * Regenerates the on-demand revalidation secret for a site. The old secret
 * stops working immediately — any customer-site webhook still configured
 * with it will start failing until it's updated with the new value, which is
 * shown once via the encrypted reveal cookie (never in the URL).
 */
export async function regenerateRevalidateSecret(siteId: string, formData?: FormData): Promise<void> {
  const user = await requireSiteOwner(siteId);

  const newSecret = generateRevalidateSecret();

  await db
    .update(sites)
    .set({ revalidateSecret: newSecret, updatedAt: new Date() })
    .where(eq(sites.id, siteId));

  await logActivity({
    userId: user.id,
    userEmail: user.email,
    siteId,
    action: "sites.secret_regenerate",
    detail: "Genererade en ny revalidate-hemlighet (den gamla slutade fungera)",
  });

  await setReveal({ scope: `site:${siteId}`, revalidateSecret: newSecret });
  redirect(settingsPath(siteId, formData));
}

/** Creates a new API key for a site. Shown once via the reveal cookie; only the hash is stored. */
export async function createApiKey(siteId: string, formData: FormData): Promise<void> {
  const user = await requireSiteOwner(siteId);

  const name = readString(formData, "name") || "Namnlös nyckel";
  const keyValue = generateApiKey();

  await db.insert(apiKeys).values({ siteId, ...apiKeyColumns(keyValue), name });

  await logActivity({
    userId: user.id,
    userEmail: user.email,
    siteId,
    action: "apikeys.create",
    detail: `Skapade API-nyckeln "${name}"`,
  });

  revalidatePath(`/admin/sites/${siteId}/installningar`);
  revalidatePath(`/admin/sites/${siteId}/integration`);

  await setReveal({ scope: `site:${siteId}`, apiKey: keyValue, apiKeyName: name });
  redirect(settingsPath(siteId, formData));
}

/**
 * Deletes an API key. Any integration still using it will immediately stop
 * being able to authenticate — the settings page warns about this before
 * the confirm dialog fires.
 */
export async function deleteApiKey(siteId: string, keyId: string, formData?: FormData): Promise<void> {
  const user = await requireSiteOwner(siteId);

  const [existing] = await db
    .select({ name: apiKeys.name })
    .from(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.siteId, siteId)))
    .limit(1);

  await db.delete(apiKeys).where(and(eq(apiKeys.id, keyId), eq(apiKeys.siteId, siteId)));

  if (existing) {
    await logActivity({
      userId: user.id,
      userEmail: user.email,
      siteId,
      action: "apikeys.delete",
      detail: `Tog bort API-nyckeln "${existing.name}"`,
    });
  }

  revalidatePath(`/admin/sites/${siteId}/installningar`);
  revalidatePath(`/admin/sites/${siteId}/integration`);

  redirect(`${settingsPath(siteId, formData)}?deleted=1`);
}

/**
 * Removes a site permanently (pages, blocks, posts, services, media rows,
 * API keys, memberships and invitations cascade via the FKs). Only admins
 * and owners may do this, and the form must repeat the site's name exactly
 * so a stray click can never wipe a customer's content. Uploaded files in
 * Vercel Blob are left as-is (harmless orphans).
 */
export async function removeSite(siteId: string, formData: FormData): Promise<void> {
  const user = await requireSiteOwner(siteId);

  const [site] = await db.select({ name: sites.name }).from(sites).where(eq(sites.id, siteId)).limit(1);
  if (!site) {
    redirect("/admin?list=1");
  }

  const confirmName = readString(formData, "confirmName");
  if (confirmName !== site.name) {
    redirect(`/admin/sites/${siteId}/installningar?error=confirm-name`);
  }

  await db.delete(sites).where(eq(sites.id, siteId));

  await logActivity({
    userId: user.id,
    userEmail: user.email,
    siteId: null,
    action: "sites.delete",
    detail: `Tog bort sajten "${site.name}" med allt innehåll`,
  });

  revalidatePath("/admin", "layout");
  redirect(`/admin?list=1&removedSite=${encodeURIComponent(site.name)}`);
}
