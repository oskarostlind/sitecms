/**
 * Idempotent seed for the "gellivare-traktor" tenant (Gällivare Traktor AB).
 *
 * Copy comes from the project's förarbete (01-FORARBETE.md §4). Rules:
 *  - Only confirmed facts are filled in. Everything the customer still has to
 *    confirm (phone, address, e-mail, opening hours, contact person, some
 *    FAQ answers) is seeded EMPTY — the site hides empty fields, so no
 *    [PLACEHOLDER] text can ever reach production.
 *  - Unconfirmed services are seeded with visible=false.
 *  - Safe to re-run: existing blocks/services are never overwritten, so edits
 *    made in the panel survive. Only missing rows are added.
 *
 * Run with: npm run db:seed:gellivare-traktor
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../lib/db";
import { apiKeys, blocks, pages, seoMeta, services, sites } from "../lib/db/schema";

type BlockSeed = { key: string; type: "text" | "richtext" | "image"; value: string };

const HOME: BlockSeed[] = [
  { key: "hero.title", type: "text", value: "Maskinentreprenad i Gällivare sedan 1958" },
  {
    key: "hero.subtitle",
    type: "richtext",
    value:
      "Hjullastare, grävmaskiner och höglyftare – med erfarna förare som kan malmfälten. Vi tar uppdrag åt byggföretag, industri, kommun och privatpersoner i Gällivare, Malmberget och Kiruna.",
  },
  { key: "hero.image", type: "image", value: "" },
  { key: "hero.trust1", type: "text", value: "Familjeföretag i tredje generationen" },
  { key: "hero.trust2", type: "text", value: "Egen maskinpark" },
  { key: "hero.trust3", type: "text", value: "Lokalt i Gällivare" },

  { key: "services.title", type: "text", value: "Det här gör vi" },
  { key: "services.intro", type: "text", value: "Markarbeten, maskiner med förare och transporter – lokalt i malmfälten." },

  { key: "fleet.title", type: "text", value: "Egen maskinpark – redo när du behöver den" },
  {
    key: "fleet.text",
    type: "richtext",
    value:
      "Vi äger våra maskiner och sköter dem själva. Det betyder kort startsträcka och maskiner du kan lita på, även när det är 30 minus.",
  },
  { key: "fleet.item1", type: "text", value: "Hjullastare" },
  { key: "fleet.count1", type: "text", value: "4" },
  { key: "fleet.item2", type: "text", value: "Grävmaskiner" },
  { key: "fleet.count2", type: "text", value: "5" },
  { key: "fleet.item3", type: "text", value: "Höglyftare" },
  { key: "fleet.count3", type: "text", value: "3" },
  { key: "fleet.item4", type: "text", value: "Traktorgrävare" },
  { key: "fleet.count4", type: "text", value: "3" },
  { key: "fleet.item5", type: "text", value: "Lastbil" },
  { key: "fleet.count5", type: "text", value: "1" },
  { key: "fleet.item6", type: "text", value: "Spårgående maskiner" },
  { key: "fleet.count6", type: "text", value: "" },

  { key: "about.title", type: "text", value: "Från två traktorer till en hel maskinpark" },
  {
    key: "about.text",
    type: "richtext",
    value:
      "Gällivare Traktor startades 1958 av Valter Johansson – med två traktorer och två anställda. Jobbet då var traktorkörning åt kommunen och ortens byggfirmor.\n\nI dag driver tredje generationen företaget vidare, med erfarna medarbetare och en maskinpark som klarar allt från mindre markjobb till stora entreprenader.\n\nVi har en välutrustad egen verkstad och maskinerna står i varmgarage – därför kan vi vara på plats snabbt även de kalla dagarna. Vi har vuxit med Gällivare, och vi känner både marken och klimatet här uppe.",
  },
  { key: "about.image", type: "image", value: "" },

  { key: "why.title", type: "text", value: "Varför Gällivare Traktor" },
  { key: "why.item1", type: "text", value: "Lokalt sedan 1958" },
  { key: "why.text1", type: "text", value: "Vi finns här och vi stannar här." },
  { key: "why.item2", type: "text", value: "Egen maskinpark" },
  { key: "why.text2", type: "text", value: "Inga mellanhänder, kort varsel." },
  { key: "why.item3", type: "text", value: "Erfarna förare" },
  { key: "why.text3", type: "text", value: "Folk som kan maskinerna och malmfälten." },

  { key: "faq.title", type: "text", value: "Vanliga frågor" },
  { key: "faq.q1", type: "text", value: "Hur snabbt får jag svar?" },
  {
    key: "faq.a1",
    type: "richtext",
    value:
      "Vi återkommer så snart vi har gått igenom din förfrågan. Du får en bekräftelse via e-post direkt när förfrågan kommit in.",
  },
  { key: "faq.q2", type: "text", value: "Kostar offerten något?" },
  { key: "faq.a2", type: "richtext", value: "Nej, offerten är kostnadsfri och inte bindande." },
  { key: "faq.q3", type: "text", value: "Vilket område jobbar ni i?" },
  {
    key: "faq.a3",
    type: "richtext",
    value:
      "Främst Gällivare, Malmberget, Koskullskulle och Kiruna – men hör av dig även om ditt uppdrag ligger längre bort.",
  },
  // Kunden måste bekräfta svaret — tomt svar = frågan visas inte.
  { key: "faq.q4", type: "text", value: "Hyr ni ut maskiner utan förare?" },
  { key: "faq.a4", type: "richtext", value: "" },
  { key: "faq.q5", type: "text", value: "Tar ni uppdrag från privatpersoner?" },
  { key: "faq.a5", type: "richtext", value: "Ja, stora som små." },
  { key: "faq.q6", type: "text", value: "Jobbar ni vintertid?" },
  { key: "faq.a6", type: "richtext", value: "Ja, vi jobbar året runt." },

  { key: "cta.title", type: "text", value: "Har du ett uppdrag?" },
  { key: "cta.subtitle", type: "text", value: "Berätta vad du behöver så återkommer vi med pris och tidplan." },
  { key: "cta.button", type: "text", value: "Begär offert" },

  { key: "contact.title", type: "text", value: "Kontakt" },
  { key: "contact.phone", type: "text", value: "0970-55 300" },
  { key: "contact.phoneLabel", type: "text", value: "Kontor" },
  { key: "contact.phoneAlt", type: "text", value: "0970-15 300" },
  { key: "contact.phoneAltLabel", type: "text", value: "Garage" },
  // Ingen allmän e-postadress finns — kontaktpersonernas adresser används i stället.
  { key: "contact.email", type: "text", value: "" },
  { key: "contact.address", type: "text", value: "Ågatan 12" },
  { key: "contact.postal", type: "text", value: "982 34 Gällivare" },
  // Öppettider är ännu inte bekräftade — tomt fält döljs på sajten.
  { key: "contact.hours", type: "richtext", value: "" },
  { key: "contact.mapQuery", type: "text", value: "" },

  // Kontaktpersoner (tomt namn = dold). Roller är inte bekräftade.
  { key: "contact.name1", type: "text", value: "Jonas Johansson" },
  { key: "contact.role1", type: "text", value: "" },
  { key: "contact.phone1", type: "text", value: "070-559 95 95" },
  { key: "contact.email1", type: "text", value: "Jonas@gellivaretraktor.se" },
  { key: "contact.name2", type: "text", value: "Markus Johansson" },
  { key: "contact.role2", type: "text", value: "" },
  { key: "contact.phone2", type: "text", value: "070-600 99 30" },
  { key: "contact.email2", type: "text", value: "Markus@gellivaretraktor.se" },
  { key: "contact.name3", type: "text", value: "Kenth Johansson" },
  { key: "contact.role3", type: "text", value: "" },
  { key: "contact.phone3", type: "text", value: "070-595 30 01" },
  { key: "contact.email3", type: "text", value: "" },
  { key: "contact.name4", type: "text", value: "" },
  { key: "contact.role4", type: "text", value: "" },
  { key: "contact.phone4", type: "text", value: "" },
  { key: "contact.email4", type: "text", value: "" },

  // Medlemskap (källa: företagets egen sida)
  { key: "memberships.item1", type: "text", value: "BDX" },
  { key: "memberships.item2", type: "text", value: "Maskinentreprenörerna" },
  { key: "memberships.item3", type: "text", value: "" },

  { key: "company.name", type: "text", value: "Gällivare Traktor AB" },
  { key: "company.orgnr", type: "text", value: "556099-6158" },
  { key: "company.founded", type: "text", value: "1958" },

  // Rekryteringsannons från företagets nuvarande startsida. Töm fälten för att dölja sektionen.
  { key: "recruit.title", type: "text", value: "Vi söker medarbetare" },
  {
    key: "recruit.text",
    type: "richtext",
    value:
      "Vi söker hjullastarförare/grävmaskinist, lastbilschaufför med CE-behörighet och TSA-förare för grävlastare och grävmaskin.\n\nHör av dig till Jonas eller Markus – kontaktuppgifter finns under Kontakt.",
  },
];

const OFFERT: BlockSeed[] = [
  { key: "offert.title", type: "text", value: "Begär offert" },
  { key: "offert.intro", type: "text", value: "Fyll i formuläret så återkommer vi så snart vi kan." },
  { key: "tack.title", type: "text", value: "Tack – vi har fått din förfrågan" },
  {
    key: "tack.text",
    type: "text",
    value: "En bekräftelse har skickats till din e-post. Vi hör av oss så snart vi kan.",
  },
];

const PRIVACY: BlockSeed[] = [
  { key: "privacy.title", type: "text", value: "Integritetspolicy" },
  { key: "privacy.months", type: "text", value: "12" },
];

const SERVICES = [
  {
    title: "Mark- och schaktarbeten",
    description:
      "Schakt, grundläggning, dränering och markplanering. Vi gör jobbet rätt från början, oavsett om det är en villatomt eller en industriyta.",
    visible: true,
  },
  {
    title: "Maskinuthyrning med förare",
    description: "Hjullastare, grävmaskin eller höglyftare med erfaren förare. Timme, dag eller längre uppdrag.",
    visible: true,
  },
  {
    title: "Lastning & materialhantering",
    description: "Lastning, flytt och hantering av material på byggarbetsplatser, upplag och industriområden.",
    visible: true,
  },
  {
    title: "Transporter",
    description: "Lastbilstransporter av massor och material i Gällivare med omnejd.",
    visible: true,
  },
  // Obekräftade — dolda tills kunden bekräftat (01-FORARBETE.md §1).
  {
    title: "Uppdrag mot gruv- och industri",
    description: "Vi är vana vid höga krav på säkerhet och tillgänglighet.",
    visible: false,
  },
  {
    title: "Verkstad & hydraulik",
    description: "Hydraulikservice, cylinderreparation och reservdelar.",
    visible: false,
  },
  { title: "Oljesanering", description: "Sanering vid oljespill.", visible: false },
  { title: "Slamsugning", description: "Slamsugning och avloppsspolning.", visible: false },
];

const SEO = [
  {
    pageSlug: "home",
    title: "Maskinentreprenad i Gällivare sedan 1958 | Gällivare Traktor AB",
    description:
      "Hjullastare, grävmaskiner och höglyftare med förare i Gällivare, Malmberget och Kiruna. Familjeföretag sedan 1958. Begär en kostnadsfri offert.",
  },
  {
    pageSlug: "offert",
    title: "Begär offert | Gällivare Traktor AB",
    description:
      "Skicka en kostnadsfri offertförfrågan på markarbeten, maskiner med förare, lastning eller transporter i Gällivare med omnejd.",
  },
  {
    pageSlug: "integritet",
    title: "Integritetspolicy | Gällivare Traktor AB",
    description: "Så behandlar Gällivare Traktor AB personuppgifter som skickas via offertformuläret.",
  },
];

async function upsertPage(siteId: string, slug: string, title: string, sortOrder: number) {
  const [page] = await db
    .insert(pages)
    .values({ siteId, slug, title, sortOrder })
    .onConflictDoUpdate({ target: [pages.siteId, pages.slug], set: { title, sortOrder } })
    .returning();
  return page;
}

/**
 * SEED_OVERWRITE=1 skriver även över befintliga block med värdena här.
 * Använd bara när innehållet ska återställas till seed-läget — annars
 * försvinner ändringar som gjorts i panelen.
 */
const OVERWRITE = process.env.SEED_OVERWRITE === "1";

/** Block som ersatts av nyare nycklar; tas bort om de är tomma. */
const OBSOLETE_KEYS = ["contact.person"];

async function insertMissingBlocks(siteId: string, pageId: string, seeds: BlockSeed[]) {
  let added = 0;
  for (const [i, b] of seeds.entries()) {
    const values = { pageId, siteId, key: b.key, type: b.type, value: b.value, sortOrder: i };
    const query = db.insert(blocks).values(values);
    const res = await (OVERWRITE
      ? query.onConflictDoUpdate({
          target: [blocks.pageId, blocks.key],
          set: { type: b.type, value: b.value, sortOrder: i, updatedAt: new Date() },
        })
      : query.onConflictDoNothing({ target: [blocks.pageId, blocks.key] })
    ).returning({ id: blocks.id });
    added += res.length;
  }
  for (const key of OBSOLETE_KEYS) {
    await db.delete(blocks).where(and(eq(blocks.pageId, pageId), eq(blocks.key, key), eq(blocks.value, "")));
  }
  return added;
}

async function main() {
  const [site] = await db
    .insert(sites)
    // Domänen sätts först vid lansering — tills dess körs sajten på Vercels adress.
    .values({ name: "Gällivare Traktor AB", slug: "gellivare-traktor", domain: null })
    .onConflictDoUpdate({ target: sites.slug, set: { updatedAt: new Date() } })
    .returning();
  console.log(`Site: ${site.name} (${site.id})`);

  const home = await upsertPage(site.id, "home", "Startsida", 0);
  const offert = await upsertPage(site.id, "offert", "Offert & tack-sida", 1);
  const privacy = await upsertPage(site.id, "integritet", "Integritetspolicy", 2);

  console.log(`Blocks added: home ${await insertMissingBlocks(site.id, home.id, HOME)}, offert ${await insertMissingBlocks(site.id, offert.id, OFFERT)}, integritet ${await insertMissingBlocks(site.id, privacy.id, PRIVACY)}`);

  let servicesAdded = 0;
  for (const [i, s] of SERVICES.entries()) {
    const existing = await db
      .select({ id: services.id })
      .from(services)
      .where(and(eq(services.siteId, site.id), eq(services.title, s.title)))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(services).values({ siteId: site.id, ...s, price: null, sortOrder: i });
      servicesAdded += 1;
    }
  }
  console.log(`Services added: ${servicesAdded}`);

  for (const entry of SEO) {
    await db
      .insert(seoMeta)
      .values({ siteId: site.id, ...entry, ogImage: null })
      .onConflictDoNothing({ target: [seoMeta.siteId, seoMeta.pageSlug] });
  }

  const [existingKey] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.siteId, site.id), eq(apiKeys.name, "Default API Key")))
    .limit(1);
  let key = existingKey?.key;
  if (!key) {
    key = randomBytes(16).toString("hex");
    await db.insert(apiKeys).values({ siteId: site.id, key, name: "Default API Key" });
    console.log("API key: created");
  } else {
    console.log("API key: already exists, reusing");
  }

  if (process.env.SEED_PRINT_KEY === "1") {
    console.log(`API_KEY=${key}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
