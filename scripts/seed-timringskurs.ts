/**
 * Idempotent seed script for the "timringskurs" tenant (Norrhed Skog).
 * Content copied verbatim from the reference clone of oskarostlind/timringskurs
 * (src/data/site.ts, src/data/kurser.ts, src/app/(site)/page.tsx, om/page.tsx,
 * kontakt/page.tsx). Image paths refer to that repo's /public directory.
 *
 * NOTE: the timringskurs site currently runs its own Sanity Studio. This seed
 * only registers the site + content in sitecms so it can be managed from the
 * panel; switching the live site from Sanity to the sitecms content API is a
 * separate decision for the owner.
 *
 * Run with: npm run db:seed:timringskurs
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { randomBytes } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { db } from "../lib/db";
import {
  sites,
  pages,
  blocks,
  services,
  seoMeta,
  apiKeys,
} from "../lib/db/schema";

type BlockSeed = {
  key: string;
  type: "text" | "richtext" | "image";
  value: string;
  sortOrder: number;
};

type PageSeed = {
  slug: string;
  title: string;
  sortOrder: number;
  blocks: BlockSeed[];
  seo?: { title: string; description: string; ogImage: string | null };
};

const SITE_NAME = "Norrhed Skog";
const SITE_DESCRIPTION =
  "Norrhed Skog håller timringskurser, motorsågsutbildning, röjsågskurser, solosågskurs, jägarexamen och skjutträning. Praktiska kurser i liten grupp med erfaren instruktör.";

const pageSeeds: PageSeed[] = [
  {
    slug: "home",
    title: "Startsida",
    sortOrder: 0,
    blocks: [
      {
        key: "hero.title",
        type: "text",
        value: "Timringskurser och skogsutbildning — med yxa i hand",
        sortOrder: 0,
      },
      {
        key: "hero.subtitle",
        type: "richtext",
        value:
          "Knuttimring, motorsågskörkort, röjsågskörkort, solosåg, jägarexamen och skjutträning. Små grupper, mycket praktik och tid vid din egen stock.",
        sortOrder: 1,
      },
      {
        key: "hero.image",
        type: "image",
        value: "/bilder/hero-timringskurs.jpg",
        sortOrder: 2,
      },
    ],
    seo: {
      title: "Norrhed Skog | Timringskurser, motorsågsutbildning och jägarexamen",
      description: SITE_DESCRIPTION,
      ogImage: "/bilder/hero-timringskurs.jpg",
    },
  },
  {
    slug: "om",
    title: "Om oss",
    sortOrder: 1,
    blocks: [
      { key: "om.title", type: "text", value: "Om Norrhed Skog", sortOrder: 0 },
      {
        key: "om.intro1",
        type: "richtext",
        value:
          "Norrhed Skog drivs av Ola Andersson med bas i Boden. Vi håller kurser i knuttimring, motorsåg, röjsåg, solosåg, jägarexamen och skjutträning — för privatpersoner, företag och föreningar.",
        sortOrder: 1,
      },
      {
        key: "om.intro2",
        type: "richtext",
        value:
          "Grundtanken är enkel: små grupper och mycket tid vid det du faktiskt ska lära dig. På en timringskurs betyder det att alla har en egen stock att arbeta med. På en motorsågskurs betyder det att du hinner såga tillräckligt många gånger för att tekniken ska sätta sig.",
        sortOrder: 2,
      },
      {
        key: "om.how.item1",
        type: "text",
        value: "Små grupper med handledning vid varje deltagare",
        sortOrder: 10,
      },
      {
        key: "om.how.item2",
        type: "text",
        value: "Mycket praktik — teori bara så mycket som behövs",
        sortOrder: 11,
      },
      {
        key: "om.how.item3",
        type: "text",
        value: "Kurser på flera orter, från Kalix till Uppsala",
        sortOrder: 12,
      },
      {
        key: "om.how.item4",
        type: "text",
        value: "Uppdragsutbildning på plats hos företag och föreningar",
        sortOrder: 13,
      },
      {
        key: "om.portrait",
        type: "image",
        value: "/bilder/ola-portratt.jpg",
        sortOrder: 20,
      },
    ],
    seo: {
      title: "Om Norrhed Skog",
      description:
        "Norrhed Skog drivs av Ola Andersson i Boden och håller kurser i timring, motorsåg, röjsåg, solosåg, jägarexamen och skjutträning.",
      ogImage: "/bilder/ola-portratt.jpg",
    },
  },
  {
    slug: "kontakt",
    title: "Kontakt",
    sortOrder: 2,
    blocks: [
      {
        key: "kontakt.title",
        type: "text",
        value: "Kontakt och anmälan",
        sortOrder: 0,
      },
      {
        key: "kontakt.intro",
        type: "richtext",
        value:
          "Anmäl dig till en kurs, anmäl intresse för ett datum som inte ligger uppe ännu, eller fråga något innan du bestämmer dig.",
        sortOrder: 1,
      },
      { key: "kontakt.phone", type: "text", value: "070-4466001", sortOrder: 10 },
      {
        key: "kontakt.email",
        type: "text",
        value: "info@timringskurs.nu",
        sortOrder: 11,
      },
      {
        key: "kontakt.address",
        type: "text",
        value: "Norrhed Skog / Ola Andersson, Boden, Sverige",
        sortOrder: 12,
      },
      {
        key: "kontakt.social.facebook",
        type: "text",
        value: "https://www.facebook.com/JagarexamenNorrbotten",
        sortOrder: 20,
      },
    ],
    seo: {
      title: "Kontakt och anmälan",
      description:
        "Anmäl dig till en kurs hos Norrhed Skog eller hör av dig med frågor. Telefon 070-4466001.",
      ogImage: null,
    },
  },
];

// Kurser (src/data/kurser.ts) modeled as services: title, short description, price.
const serviceSeeds = [
  {
    title: "Timringskurs",
    description:
      "Lär dig knuttimra för hand — från stock till färdig knut. 2 dagar, Kalix/Uppsala/Norsjö m.fl.",
    price: "Se aktuellt tillfälle",
    sortOrder: 0,
  },
  {
    title: "Motorsågskurs",
    description:
      "Motorsågskörkort nivå A och B enligt Säker Skog. Norrbotten och efter överenskommelse.",
    price: "Kontakta för offert",
    sortOrder: 1,
  },
  {
    title: "Röjsågskurs",
    description: "Röjsågskörkort nivå RA och RB. Norrbotten och efter överenskommelse.",
    price: "Kontakta för offert",
    sortOrder: 2,
  },
  {
    title: "Solosågskurs",
    description: "Såga eget virke med solosåg direkt i skogen.",
    price: "Kontakta för offert",
    sortOrder: 3,
  },
  {
    title: "Jägarexamen",
    description: "Intensivpaket mot fullständig jägarexamen i Sunderbyn. 4 dagar.",
    price: "5 500 kr (intensivpaket)",
    sortOrder: 4,
  },
  {
    title: "Skjutträning",
    description:
      "Skjutkurs för dig som vill bli säkrare på banan och i skogen. 2 dagar, Sunderbyn.",
    price: "2 500 kr",
    sortOrder: 5,
  },
];

async function main() {
  // 1. Site
  const [site] = await db
    .insert(sites)
    .values({
      name: SITE_NAME,
      slug: "timringskurs",
      domain: "timringskurs.nu",
    })
    .onConflictDoUpdate({
      target: sites.slug,
      set: { name: SITE_NAME, domain: "timringskurs.nu", updatedAt: new Date() },
    })
    .returning();

  console.log(`Site: ${site.name} (${site.id})`);

  // 2. Pages + blocks + SEO
  for (const p of pageSeeds) {
    const [page] = await db
      .insert(pages)
      .values({
        siteId: site.id,
        slug: p.slug,
        title: p.title,
        sortOrder: p.sortOrder,
      })
      .onConflictDoUpdate({
        target: [pages.siteId, pages.slug],
        set: { title: p.title, sortOrder: p.sortOrder, updatedAt: new Date() },
      })
      .returning();

    for (const b of p.blocks) {
      await db
        .insert(blocks)
        .values({
          pageId: page.id,
          siteId: site.id,
          key: b.key,
          type: b.type,
          value: b.value,
          sortOrder: b.sortOrder,
        })
        .onConflictDoUpdate({
          target: [blocks.pageId, blocks.key],
          set: {
            type: b.type,
            value: b.value,
            sortOrder: b.sortOrder,
            updatedAt: new Date(),
          },
        });
    }
    console.log(`Page "${p.slug}": ${p.blocks.length} blocks upserted`);

    if (p.seo) {
      await db
        .insert(seoMeta)
        .values({
          siteId: site.id,
          pageSlug: p.slug,
          title: p.seo.title,
          description: p.seo.description,
          ogImage: p.seo.ogImage,
        })
        .onConflictDoUpdate({
          target: [seoMeta.siteId, seoMeta.pageSlug],
          set: {
            title: p.seo.title,
            description: p.seo.description,
            ogImage: p.seo.ogImage,
            updatedAt: new Date(),
          },
        });
      console.log(`SEO meta "${p.slug}": upserted`);
    }
  }

  // 3. Services (kurser)
  for (const s of serviceSeeds) {
    const existing = await db
      .select({ id: services.id })
      .from(services)
      .where(and(eq(services.siteId, site.id), eq(services.title, s.title)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(services)
        .set({
          description: s.description,
          price: s.price,
          sortOrder: s.sortOrder,
          visible: true,
          updatedAt: new Date(),
        })
        .where(eq(services.id, existing[0].id));
    } else {
      await db.insert(services).values({
        siteId: site.id,
        title: s.title,
        description: s.description,
        price: s.price,
        sortOrder: s.sortOrder,
        visible: true,
      });
    }
  }
  console.log(`Services: ${serviceSeeds.length} upserted`);

  // 4. API key (only create if none exists yet)
  const existingKey = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.siteId, site.id), eq(apiKeys.name, "Default API Key")))
    .limit(1);

  let apiKeyValue: string;
  if (existingKey.length > 0) {
    apiKeyValue = existingKey[0].key;
    console.log(`API key: already exists, reusing.`);
  } else {
    apiKeyValue = randomBytes(16).toString("hex");
    await db.insert(apiKeys).values({
      siteId: site.id,
      key: apiKeyValue,
      name: "Default API Key",
    });
    console.log(`API key: created.`);
  }

  console.log("\n=== SEED SUMMARY (timringskurs) ===");
  console.log(`Site slug: ${site.slug}`);
  console.log(`API key (timringskurs): ${apiKeyValue}`);
  console.log("====================================\n");
}

main()
  .then(() => {
    console.log("Seed completed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
