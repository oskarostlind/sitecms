/**
 * Idempotent seed script for the "jjbygg" tenant.
 * Content below is copied verbatim from the reference clone at
 * jjbygg-ref (lib/site-content.ts, lib/hero-slides.ts, lib/seo.ts, app/page.tsx).
 *
 * Run with: npm run db:seed
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { randomBytes } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { db } from "../lib/db";
import { apiKeyColumns, generateApiKey } from "../lib/api-keys";
import {
  sites,
  pages,
  blocks,
  services,
  seoMeta,
  apiKeys,
} from "../lib/db/schema";

async function main() {
  // -------------------------------------------------------------------
  // 1. Site
  // -------------------------------------------------------------------
  const [site] = await db
    .insert(sites)
    .values({
      name: "JJ Bygg & Entreprenad AB",
      slug: "jjbygg",
      domain: "jjbyggboden.se",
    })
    .onConflictDoUpdate({
      target: sites.slug,
      set: {
        name: "JJ Bygg & Entreprenad AB",
        domain: "jjbyggboden.se",
        updatedAt: new Date(),
      },
    })
    .returning();

  console.log(`Site: ${site.name} (${site.id})`);

  // -------------------------------------------------------------------
  // 2. Page "home"
  // -------------------------------------------------------------------
  const [homePage] = await db
    .insert(pages)
    .values({
      siteId: site.id,
      slug: "home",
      title: "Startsida",
      sortOrder: 0,
    })
    .onConflictDoUpdate({
      target: [pages.siteId, pages.slug],
      set: { title: "Startsida", updatedAt: new Date() },
    })
    .returning();

  console.log(`Page: ${homePage.slug} (${homePage.id})`);

  // -------------------------------------------------------------------
  // 3. Blocks for the home page
  //    Content sourced from jjbygg-ref: lib/site-content.ts (hero, homePage,
  //    footer), lib/hero-slides.ts (hero image), app/page.tsx (FAQ section
  //    rendered inline on the home page -> modeled here as faq.q1..q3/a1..a3
  //    blocks on the same "home" page, rather than a separate "faq" page,
  //    since the reference site renders FAQ directly on "/").
  // -------------------------------------------------------------------
  type BlockSeed = {
    key: string;
    type: "text" | "richtext" | "image";
    value: string;
    sortOrder: number;
  };

  const homeBlocks: BlockSeed[] = [
    // Hero
    {
      key: "hero.title",
      type: "text",
      value: "Professionell bygg & entreprenad i Boden och Luleå",
      sortOrder: 0,
    },
    {
      key: "hero.subtitle",
      type: "richtext",
      value:
        "JJ Bygg & Entreprenad AB hjälper dig med allt från nybyggnation och tillbyggnad till altaner och takbyten. Kvalitet, transparens och lokalt engagemang i hela Norrbotten.",
      sortOrder: 1,
    },
    {
      key: "hero.image",
      type: "image",
      value: "/hero/benjamin-lehman-EJU7A__krX0-unsplash.jpg",
      sortOrder: 2,
    },
    // Why choose us (siteContent.homePage.trust)
    {
      key: "why.item1",
      type: "text",
      value: "Professionella hantverkare",
      sortOrder: 10,
    },
    {
      key: "why.item2",
      type: "text",
      value: "Snabbt återkommande",
      sortOrder: 11,
    },
    {
      key: "why.item3",
      type: "text",
      value: "Transparenta priser",
      sortOrder: 12,
    },
    // CTA
    {
      key: "cta.title",
      type: "text",
      value: "Redo att komma igång?",
      sortOrder: 20,
    },
    {
      key: "cta.subtitle",
      type: "text",
      value: "Skicka in din förfrågan så återkommer vi så snart vi kan.",
      sortOrder: 21,
    },
    // Footer
    {
      key: "footer.company",
      type: "text",
      value: "JJ Bygg & Entreprenad AB",
      sortOrder: 30,
    },
    {
      key: "footer.orgnr",
      type: "text",
      value: "556832-8362",
      sortOrder: 31,
    },
    {
      key: "footer.address",
      type: "text",
      value: "Kallkällvägen 16 c, 961 96 Boden",
      sortOrder: 32,
    },
    {
      key: "footer.contactName",
      type: "text",
      value: "Jesper Johansson",
      sortOrder: 33,
    },
    {
      key: "footer.phone",
      type: "text",
      value: "070-535 71 94",
      sortOrder: 34,
    },
    {
      key: "footer.email",
      type: "text",
      value: "info@jjbyggboden.se",
      sortOrder: 35,
    },
    // FAQ (siteContent.homePage.faq) - kept as blocks on the "home" page
    // rather than a separate page, matching the reference site where the
    // FAQ section lives directly on "/".
    {
      key: "faq.q1",
      type: "text",
      value: "Hur snabbt får jag svar på min offertförfrågan?",
      sortOrder: 40,
    },
    {
      key: "faq.a1",
      type: "richtext",
      value:
        "Vi strävar efter att återkomma inom 1–2 vardagar efter att du skickat in formuläret. Vid hög belastning kan det ibland ta lite längre tid; du får alltid en bekräftelse till din e-post när förfrågan har tagits emot.",
      sortOrder: 41,
    },
    {
      key: "faq.q2",
      type: "text",
      value: "Är offerten kostnadsfri?",
      sortOrder: 42,
    },
    {
      key: "faq.a2",
      type: "richtext",
      value:
        "Ja – att begära offert via vår webbplats är kostnadsfri och förbindande. Vi går igenom dina önskemål och återkommer med förslag eller kompletterande frågor innan eventuell upphandling.",
      sortOrder: 43,
    },
    {
      key: "faq.q3",
      type: "text",
      value: "Hur fungerar ROT-avdrag?",
      sortOrder: 44,
    },
    {
      key: "faq.a3",
      type: "richtext",
      value:
        "ROT-avdrag är en skattereduktion för godkända reparations-, underhålls- och ombyggnadsarbeten hos privatpersoner. Regler och belopp beslutas av riksdagen och administreras av Skatteverket. Vi informerar om vad som gäller för ditt projekt; kontrollera alltid aktuella villkor på skatteverket.se.",
      sortOrder: 45,
    },
  ];

  for (const b of homeBlocks) {
    await db
      .insert(blocks)
      .values({
        pageId: homePage.id,
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
  console.log(`Blocks: ${homeBlocks.length} upserted on page "home"`);

  // -------------------------------------------------------------------
  // 4. Services (siteContent.homePage.services)
  // -------------------------------------------------------------------
  const serviceSeeds = [
    {
      title: "Nybyggnation & Tillbyggnad",
      description: "Hus, garage, utbyggnader",
      sortOrder: 0,
    },
    {
      title: "Renovering & Interiör",
      description: "Kök, ytskikt, totalrenoveringar",
      sortOrder: 1,
    },
    {
      title: "Badrum & Våtrum",
      description: "Med fokus på certifiering och kvalitet",
      sortOrder: 2,
    },
    {
      title: "Altaner & Uteplatser",
      description: "Skräddarsydda trädäck, uterum och staket",
      sortOrder: 3,
    },
    {
      title: "Takbyten & Plåtarbeten",
      description: "Hållbara takbyten anpassade för det norrländska klimatet",
      sortOrder: 4,
    },
    {
      title: "Entreprenad & Planering",
      description: "Helhetsansvar, projektledning och lokala samarbetspartners",
      sortOrder: 5,
    },
  ];

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
        price: null,
        sortOrder: s.sortOrder,
        visible: true,
      });
    }
  }
  console.log(`Services: ${serviceSeeds.length} upserted`);

  // -------------------------------------------------------------------
  // 5. SEO meta for "home"
  //    Source: jjbygg-ref lib/site-content.ts (meta.title / meta.description)
  //    and lib/seo.ts (og image = siteContent.logo.primary).
  // -------------------------------------------------------------------
  await db
    .insert(seoMeta)
    .values({
      siteId: site.id,
      pageSlug: "home",
      title: "Bygg & entreprenad i Boden och Luleå | JJ Bygg",
      description:
        "JJ Bygg & Entreprenad AB utför nybyggnad, renovering, altaner och takbyte i Boden och Luleå. Kontakta oss för en kostnadsfri offert!",
      ogImage: "/logo.png",
    })
    .onConflictDoUpdate({
      target: [seoMeta.siteId, seoMeta.pageSlug],
      set: {
        title: "Bygg & entreprenad i Boden och Luleå | JJ Bygg",
        description:
          "JJ Bygg & Entreprenad AB utför nybyggnad, renovering, altaner och takbyte i Boden och Luleå. Kontakta oss för en kostnadsfri offert!",
        ogImage: "/logo.png",
        updatedAt: new Date(),
      },
    });
  console.log(`SEO meta: "home" upserted`);

  // -------------------------------------------------------------------
  // 6. API key for the jjbygg site (only create if none exists yet)
  // -------------------------------------------------------------------
  const existingKey = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.siteId, site.id), eq(apiKeys.name, "Default API Key")))
    .limit(1);

  // Nycklar lagras bara som hash, så en befintlig nyckel kan inte skrivas ut igen.
  let apiKeyValue: string;
  if (existingKey.length > 0) {
    apiKeyValue = `(finns redan, slutar på ${existingKey[0].keyHint} — skapa en ny i panelen om du behöver klartexten)`;
    console.log(`API key: already exists, reusing.`);
  } else {
    apiKeyValue = generateApiKey();
    await db.insert(apiKeys).values({
      siteId: site.id,
      ...apiKeyColumns(apiKeyValue),
      name: "Default API Key",
    });
    console.log(`API key: created.`);
  }

  console.log("\n=== SEED SUMMARY ===");
  console.log(`Site slug: ${site.slug}`);
  console.log(`API key (jjbygg): ${apiKeyValue}`);
  console.log("=====================\n");
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
