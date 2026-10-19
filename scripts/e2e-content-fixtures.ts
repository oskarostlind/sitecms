/**
 * Ensures the isolated e2e-test site has editable content for browser E2E:
 * a page with a text block, one service, one seo row and an API key.
 * Idempotent; only touches the synthetic e2e-test tenant.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../lib/db";
import { apiKeys, blocks, pages, seoMeta, services, sites } from "../lib/db/schema";
import { apiKeyColumns, generateApiKey } from "../lib/api-keys";

async function main() {
  const [site] = await db.select().from(sites).where(eq(sites.slug, "e2e-test")).limit(1);
  if (!site) throw new Error("e2e-test site missing — run e2e-fixtures first");

  let [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.siteId, site.id), eq(pages.slug, "hem")))
    .limit(1);
  if (!page) {
    [page] = await db
      .insert(pages)
      .values({ siteId: site.id, slug: "hem", title: "Hem", sortOrder: 0 })
      .returning();
  }

  let [block] = await db
    .select()
    .from(blocks)
    .where(and(eq(blocks.pageId, page.id), eq(blocks.key, "hero.title")))
    .limit(1);
  if (!block) {
    [block] = await db
      .insert(blocks)
      .values({
        pageId: page.id,
        siteId: site.id,
        key: "hero.title",
        type: "text",
        value: "E2E hero title (initial)",
        sortOrder: 0,
      })
      .returning();
  }

  let [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.siteId, site.id), eq(services.title, "E2E-tjänst")))
    .limit(1);
  if (!service) {
    [service] = await db
      .insert(services)
      .values({ siteId: site.id, title: "E2E-tjänst", description: "Testtjänst", price: "1 kr", sortOrder: 0 })
      .returning();
  }

  let [seo] = await db
    .select()
    .from(seoMeta)
    .where(and(eq(seoMeta.siteId, site.id), eq(seoMeta.pageSlug, "hem")))
    .limit(1);
  if (!seo) {
    [seo] = await db
      .insert(seoMeta)
      .values({ siteId: site.id, pageSlug: "hem", title: "E2E SEO title (initial)" })
      .returning();
  }

  // Nycklar lagras bara som hash: ersätt E2E-nyckeln varje körning så att
  // klartexten finns att skriva ut.
  await db.delete(apiKeys).where(and(eq(apiKeys.siteId, site.id), eq(apiKeys.name, "E2E")));
  const apiKeyValue = generateApiKey();
  await db.insert(apiKeys).values({ siteId: site.id, ...apiKeyColumns(apiKeyValue), name: "E2E" });

  console.log(
    JSON.stringify({
      siteId: site.id,
      pageId: page.id,
      blockId: block.id,
      serviceId: service.id,
      seoId: seo.id,
      apiKey: apiKeyValue,
    })
  );
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
