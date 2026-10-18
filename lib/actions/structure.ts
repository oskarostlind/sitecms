"use server";

import { and, count, eq, max, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, blocks, pages, seoMeta } from "@/lib/db";
import { requireSiteOwner } from "@/lib/guard";
import { triggerSiteRevalidation } from "@/lib/revalidate";
import { logActivity } from "@/lib/audit";
import { slugify } from "@/components/content/slugify";
import {
  SCHEMA_BLOCK_TYPES,
  SCHEMA_KEY_PATTERN,
  SCHEMA_LIMITS,
  SCHEMA_SLUG_PATTERN,
  type SchemaBlockType,
} from "@/lib/schema-validate";

/**
 * Strukturhantering i panelen: sidor och fält (block). Bara owners och
 * admins (requireSiteOwner) — editors redigerar innehåll men ändrar inte
 * vilka fält som finns. Samma regler för slug/key som schema-sync
 * (lib/schema-validate.ts), så att panelen och kundsajtens deklaration aldrig
 * kan skapa något som den andra inte accepterar.
 */

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function pagesPath(siteId: string) {
  return `/admin/sites/${siteId}/pages`;
}

function editorPath(siteId: string, pageId: string) {
  return `/admin/sites/${siteId}/pages/${pageId}`;
}

async function afterChange(siteId: string): Promise<void> {
  revalidatePath(`/admin/sites/${siteId}`, "layout");
  await triggerSiteRevalidation(siteId);
}

async function slugTaken(siteId: string, slug: string, exceptPageId?: string): Promise<boolean> {
  const rows = await db
    .select({ id: pages.id })
    .from(pages)
    .where(
      and(
        eq(pages.siteId, siteId),
        eq(pages.slug, slug),
        ...(exceptPageId ? [ne(pages.id, exceptPageId)] : []),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** Första lediga varianten av en slug: om-oss, om-oss-2, om-oss-3 … */
async function freeSlug(siteId: string, base: string): Promise<string> {
  let candidate = base;
  for (let attempt = 2; await slugTaken(siteId, candidate); attempt += 1) {
    const suffix = `-${attempt}`;
    candidate = `${base.slice(0, SCHEMA_LIMITS.slugLength - suffix.length)}${suffix}`;
  }
  return candidate;
}

/** Normaliserar en slug från formuläret. null = ogiltig. */
function normalizeSlug(input: string): string | null {
  const slug = slugify(input).slice(0, SCHEMA_LIMITS.slugLength);
  return slug && SCHEMA_SLUG_PATTERN.test(slug) ? slug : null;
}

function isUniqueViolation(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code ?? (err as { cause?: { code?: unknown } } | null)?.cause?.code;
  return code === "23505";
}

// ---------------------------------------------------------------------------
// Sidor
// ---------------------------------------------------------------------------

/**
 * Skapar en ny sida. Formulärfält: `title` (krävs), `slug` (valfri — annars
 * från titeln), `description` (valfri). En uttryckligen angiven slug som
 * redan finns ger fel; en slug härledd ur titeln får suffix (-2, -3 …).
 * Redirectar till sideditorn för den nya sidan.
 */
export async function createPage(siteId: string, formData: FormData): Promise<void> {
  const user = await requireSiteOwner(siteId);

  const title = readString(formData, "title").slice(0, SCHEMA_LIMITS.titleLength);
  const slugInput = readString(formData, "slug");
  const description = readString(formData, "description").slice(0, SCHEMA_LIMITS.descriptionLength) || null;

  if (!title) redirect(`${pagesPath(siteId)}?error=missing-title`);

  let slug: string;
  if (slugInput) {
    const normalized = normalizeSlug(slugInput);
    if (!normalized) redirect(`${pagesPath(siteId)}?error=invalid-slug`);
    if (await slugTaken(siteId, normalized)) redirect(`${pagesPath(siteId)}?error=slug-taken`);
    slug = normalized;
  } else {
    const base = normalizeSlug(title);
    if (!base) redirect(`${pagesPath(siteId)}?error=invalid-slug`);
    slug = await freeSlug(siteId, base);
  }

  const [last] = await db
    .select({ maxSort: max(pages.sortOrder) })
    .from(pages)
    .where(eq(pages.siteId, siteId));
  const sortOrder = last?.maxSort === null || last?.maxSort === undefined ? 0 : last.maxSort + 1;

  let pageId: string;
  try {
    const [row] = await db
      .insert(pages)
      .values({ siteId, slug, title, description, sortOrder })
      .returning({ id: pages.id });
    pageId = row.id;
  } catch (err) {
    if (isUniqueViolation(err)) redirect(`${pagesPath(siteId)}?error=slug-taken`);
    throw err;
  }

  await afterChange(siteId);
  await logActivity({
    userId: user.id,
    userEmail: user.email,
    siteId,
    action: "pages.create",
    detail: `Skapade sidan "${title}" (/${slug})`,
  });
  redirect(`${editorPath(siteId, pageId)}?created=1`);
}

/**
 * Byter namn på en sida. Formulärfält: `title` (krävs), `slug` (valfri —
 * tom = oförändrad), `description` (tom = ingen). Byts slug flyttas sidans
 * SEO-inställningar med.
 */
export async function renamePage(siteId: string, pageId: string, formData: FormData): Promise<void> {
  const user = await requireSiteOwner(siteId);

  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.id, pageId), eq(pages.siteId, siteId)))
    .limit(1);
  if (!page) redirect(`${pagesPath(siteId)}?error=not-found`);

  const title = readString(formData, "title").slice(0, SCHEMA_LIMITS.titleLength);
  const slugInput = readString(formData, "slug");
  const description = readString(formData, "description").slice(0, SCHEMA_LIMITS.descriptionLength) || null;

  if (!title) redirect(`${pagesPath(siteId)}?error=missing-title`);

  let slug = page.slug;
  if (slugInput && slugInput !== page.slug) {
    const normalized = normalizeSlug(slugInput);
    if (!normalized) redirect(`${pagesPath(siteId)}?error=invalid-slug`);
    if (normalized !== page.slug && (await slugTaken(siteId, normalized, page.id))) {
      redirect(`${pagesPath(siteId)}?error=slug-taken`);
    }
    slug = normalized;
  }

  try {
    await db
      .update(pages)
      .set({ title, slug, description, updatedAt: new Date() })
      .where(and(eq(pages.id, page.id), eq(pages.siteId, siteId)));
  } catch (err) {
    if (isUniqueViolation(err)) redirect(`${pagesPath(siteId)}?error=slug-taken`);
    throw err;
  }

  // SEO-inställningar är kopplade till sidans slug — följ med vid adressbyte,
  // om det inte redan finns inställningar för den nya adressen.
  if (slug !== page.slug) {
    const [conflict] = await db
      .select({ id: seoMeta.id })
      .from(seoMeta)
      .where(and(eq(seoMeta.siteId, siteId), eq(seoMeta.pageSlug, slug)))
      .limit(1);
    if (!conflict) {
      await db
        .update(seoMeta)
        .set({ pageSlug: slug, updatedAt: new Date() })
        .where(and(eq(seoMeta.siteId, siteId), eq(seoMeta.pageSlug, page.slug)));
    }
  }

  await afterChange(siteId);

  const changes: string[] = [];
  if (title !== page.title) changes.push(`bytte namn från "${page.title}" till "${title}"`);
  if (slug !== page.slug) changes.push(`ny adress /${slug} (tidigare /${page.slug})`);
  if ((page.description ?? null) !== description) changes.push("ny beskrivning");

  if (changes.length > 0) {
    await logActivity({
      userId: user.id,
      userEmail: user.email,
      siteId,
      action: "pages.update",
      detail: `Sidan "${title}": ${changes.join(", ")}`,
    });
  }
  redirect(`${pagesPath(siteId)}?saved=1`);
}

/** Tar bort en sida och alla dess fält (blocks via ON DELETE CASCADE). */
export async function deletePage(siteId: string, pageId: string): Promise<void> {
  const user = await requireSiteOwner(siteId);

  const [page] = await db
    .select({ id: pages.id, title: pages.title, slug: pages.slug })
    .from(pages)
    .where(and(eq(pages.id, pageId), eq(pages.siteId, siteId)))
    .limit(1);
  if (!page) redirect(`${pagesPath(siteId)}?error=not-found`);

  const [stats] = await db.select({ n: count() }).from(blocks).where(eq(blocks.pageId, page.id));
  const fieldCount = stats?.n ?? 0;

  await db.delete(pages).where(and(eq(pages.id, page.id), eq(pages.siteId, siteId)));

  await afterChange(siteId);
  await logActivity({
    userId: user.id,
    userEmail: user.email,
    siteId,
    action: "pages.delete",
    detail: `Tog bort sidan "${page.title}" (/${page.slug}) med ${fieldCount} fält`,
  });
  redirect(`${pagesPath(siteId)}?deleted=1`);
}

// ---------------------------------------------------------------------------
// Fält (block)
// ---------------------------------------------------------------------------

/**
 * Lägger till ett fält sist på en sida. Formulärfält: `key` (krävs, t.ex.
 * "hero.title"), `type` (text | richtext | image, default text), `label`
 * och `help` (valfria). Nyckeln måste vara unik på sidan.
 */
export async function createBlock(siteId: string, pageId: string, formData: FormData): Promise<void> {
  const user = await requireSiteOwner(siteId);
  const back = editorPath(siteId, pageId);

  const [page] = await db
    .select({ id: pages.id, title: pages.title })
    .from(pages)
    .where(and(eq(pages.id, pageId), eq(pages.siteId, siteId)))
    .limit(1);
  if (!page) redirect(`${pagesPath(siteId)}?error=not-found`);

  const key = readString(formData, "key");
  const typeInput = readString(formData, "type") || "text";
  const label = readString(formData, "label").slice(0, SCHEMA_LIMITS.labelLength) || null;
  const help = readString(formData, "help").slice(0, SCHEMA_LIMITS.helpLength) || null;

  if (!key) redirect(`${back}?error=missing-key`);
  if (key.length > SCHEMA_LIMITS.keyLength || !SCHEMA_KEY_PATTERN.test(key)) {
    redirect(`${back}?error=invalid-key`);
  }
  if (!(SCHEMA_BLOCK_TYPES as readonly string[]).includes(typeInput)) {
    redirect(`${back}?error=invalid-type`);
  }
  const type = typeInput as SchemaBlockType;

  const [existing] = await db
    .select({ id: blocks.id })
    .from(blocks)
    .where(and(eq(blocks.pageId, page.id), eq(blocks.key, key)))
    .limit(1);
  if (existing) redirect(`${back}?error=key-taken`);

  const [last] = await db
    .select({ maxSort: max(blocks.sortOrder) })
    .from(blocks)
    .where(eq(blocks.pageId, page.id));
  const sortOrder = last?.maxSort === null || last?.maxSort === undefined ? 0 : last.maxSort + 1;

  try {
    await db.insert(blocks).values({
      pageId: page.id,
      siteId,
      key,
      type,
      value: null,
      alt: null,
      label,
      help,
      sortOrder,
    });
  } catch (err) {
    if (isUniqueViolation(err)) redirect(`${back}?error=key-taken`);
    throw err;
  }

  await afterChange(siteId);
  await logActivity({
    userId: user.id,
    userEmail: user.email,
    siteId,
    action: "blocks.create",
    detail: `Lade till fältet "${label ?? key}" (${key}) på ${page.title}`,
  });

  const dot = key.indexOf(".");
  const group = dot >= 0 ? key.slice(0, dot) : key;
  redirect(`${back}?created=1#grupp-${group}`);
}

/** Tar bort ett fält (och dess innehåll) från en sida. */
export async function deleteBlock(siteId: string, pageId: string, blockId: string): Promise<void> {
  const user = await requireSiteOwner(siteId);
  const back = editorPath(siteId, pageId);

  const [block] = await db
    .select({ id: blocks.id, key: blocks.key, label: blocks.label, pageTitle: pages.title })
    .from(blocks)
    .innerJoin(pages, eq(blocks.pageId, pages.id))
    .where(and(eq(blocks.id, blockId), eq(blocks.siteId, siteId), eq(blocks.pageId, pageId)))
    .limit(1);
  if (!block) redirect(`${back}?error=field-not-found`);

  await db.delete(blocks).where(and(eq(blocks.id, block.id), eq(blocks.siteId, siteId)));

  await afterChange(siteId);
  await logActivity({
    userId: user.id,
    userEmail: user.email,
    siteId,
    action: "blocks.delete",
    detail: `Tog bort fältet "${block.label ?? block.key}" (${block.key}) på ${block.pageTitle}`,
  });
  redirect(`${back}?deleted=1`);
}
