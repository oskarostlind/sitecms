/**
 * LOKAL testdata för live-förhandsgranskningen — kör aldrig mot produktion.
 *
 *   DATABASE_DRIVER=pg DATABASE_URL=postgres://… npm run db:seed:preview
 *
 * Skapar (idempotent):
 *   - testkontot forhandsgranskning@sitecms.local / lokal-forhandsgranskning
 *     (kund, ägare av testsajten, e-post bekräftad),
 *   - sajten "Förhandsgranskning (lokal)" (slug preview-lokal) med två sidor
 *     (home, om-oss), text-, richtext- och bildfält och
 *     preview_url = http://localhost:4310 (scripts/preview-test-site.mjs),
 *   - API-nyckeln scms_lokal_forhandsgranskning (bara hashen lagras).
 * Vägrar köra om DATABASE_URL inte pekar på localhost.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "../lib/db";
import { apiKeys, blocks, memberships, pages, sites, users } from "../lib/db/schema";
import { apiKeyColumns } from "../lib/api-keys";

export const LOCAL_PREVIEW = {
  email: "forhandsgranskning@sitecms.local",
  password: "lokal-forhandsgranskning",
  slug: "preview-lokal",
  apiKey: "scms_lokal_forhandsgranskning",
  previewUrl: "http://localhost:4310",
} as const;

const PAGES = [
  {
    slug: "home",
    title: "Startsida",
    description: "Det besökaren ser först.",
    blocks: [
      { key: "hero.title", type: "text", label: "Rubrik", help: "Max 60 tecken", value: "Vi bygger tryggt i Norrbotten" },
      { key: "hero.subtitle", type: "text", label: "Underrubrik", value: "Tak, fasader och tillbyggnader sedan 1998." },
      {
        key: "hero.image",
        type: "image",
        label: "Hero-bild",
        value: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=70",
        alt: "Byggarbetare på ett tak",
      },
      { key: "intro.body", type: "richtext", label: "Ingress", value: "Vi är ett **lokalt** byggföretag.\n\n- Fast pris\n- Egen personal" },
      { key: "kontakt.telefon", type: "text", label: "Telefon", value: "0970-123 45" },
    ],
  },
  {
    slug: "om-oss",
    title: "Om oss",
    description: "Företagets historia.",
    blocks: [
      { key: "om.title", type: "text", label: "Rubrik", value: "Om oss" },
      { key: "om.body", type: "richtext", label: "Text", value: "Grundat **1998** i Gällivare." },
    ],
  },
] as const;

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url) && !url.includes("host=/tmp")) {
    throw new Error("seed-preview-local: DATABASE_URL pekar inte på localhost — avbryter.");
  }

  const passwordHash = await bcrypt.hash(LOCAL_PREVIEW.password, 10);
  const [user] = await db
    .insert(users)
    .values({ email: LOCAL_PREVIEW.email, name: "Lokal testare", role: "customer", passwordHash, emailVerifiedAt: new Date() })
    .onConflictDoUpdate({ target: users.email, set: { passwordHash, emailVerifiedAt: new Date(), updatedAt: new Date() } })
    .returning();

  const [site] = await db
    .insert(sites)
    .values({ name: "Förhandsgranskning (lokal)", slug: LOCAL_PREVIEW.slug, previewUrl: LOCAL_PREVIEW.previewUrl, createdByUserId: user.id })
    .onConflictDoUpdate({ target: sites.slug, set: { previewUrl: LOCAL_PREVIEW.previewUrl, updatedAt: new Date() } })
    .returning();

  const [membership] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.userId, user.id), eq(memberships.siteId, site.id)))
    .limit(1);
  if (!membership) await db.insert(memberships).values({ userId: user.id, siteId: site.id, role: "owner" });

  const keyColumns = apiKeyColumns(LOCAL_PREVIEW.apiKey);
  const [key] = await db.select({ id: apiKeys.id }).from(apiKeys).where(eq(apiKeys.keyHash, keyColumns.keyHash)).limit(1);
  if (!key) await db.insert(apiKeys).values({ siteId: site.id, name: "Lokal testsajt", ...keyColumns });

  const pageIds: Record<string, string> = {};
  for (const [pageIndex, page] of PAGES.entries()) {
    const [row] = await db
      .insert(pages)
      .values({ siteId: site.id, slug: page.slug, title: page.title, description: page.description, sortOrder: pageIndex })
      .onConflictDoUpdate({ target: [pages.siteId, pages.slug], set: { title: page.title, description: page.description } })
      .returning();
    pageIds[page.slug] = row.id;
    for (const [index, block] of page.blocks.entries()) {
      await db
        .insert(blocks)
        .values({
          siteId: site.id,
          pageId: row.id,
          key: block.key,
          type: block.type,
          label: block.label,
          help: "help" in block ? block.help : null,
          value: block.value,
          alt: "alt" in block ? block.alt : null,
          sortOrder: index,
        })
        .onConflictDoNothing();
    }
  }

  console.log("Lokal testdata för förhandsgranskningen:");
  console.log(`  Inloggning: ${LOCAL_PREVIEW.email} / ${LOCAL_PREVIEW.password}`);
  console.log(`  Sajt:       ${site.name} (${site.id})`);
  console.log(`  Redigerare: http://localhost:3000/admin/sites/${site.id}/pages/${pageIds.home}`);
  console.log(`  API-nyckel: ${LOCAL_PREVIEW.apiKey}`);
  console.log(`  Testsajt:   node scripts/preview-test-site.mjs  (${LOCAL_PREVIEW.previewUrl})`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
