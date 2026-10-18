import type { Guide } from "../types";

const guide: Guide = {
  slug: "lat-kunden-redigera-nextjs",
  audience: "utvecklare",
  title: "Låt kunden redigera en Next.js-sajt",
  h1: "Låt kunden redigera texterna på en Next.js-sajt – utan att ge dem koden",
  description:
    "Så låter du kunden redigera innehållet på en Next.js-sajt: headless CMS, Payload, git-baserat eller eget. Ärlig jämförelse och revalidering med App Router.",
  primaryQuery: "låta kunden redigera innehåll next.js",
  published: "2026-10-18",
  modified: "2026-10-18",
  intro: [
    "Flytta de texter och bilder kunden vill ändra ut ur koden och in i ett CMS med strukturerade fält, och låt CMS:et trigga en revalidering av sajten när kunden sparar. Layouten och komponenterna stannar i repot, innehållet hämtas via API.",
    "Vilket CMS som passar beror på var du vill att innehållet ska bo, hur mycket kunden ska kunna ändra och vad det får kosta. Nedan jämför vi alternativen ärligt och visar hur cachningen fungerar med App Router.",
  ],
  summary: [
    "Bestäm först **exakt vilka fält** kunden ska kunna ändra: rubriker, brödtext, bilder, priser, nyheter. Resten stannar i koden.",
    "Välj typ: headless SaaS (Sanity, Storyblok), self-hosted i samma app (Payload), git-baserat (TinaCMS, Decap) eller ett enkelt CMS för strukturerade fält.",
    "Hämta innehållet med `fetch` och en cache-tagg, och låt CMS:ets webhook anropa en route som kör `revalidateTag`.",
    "Ge kunden strukturerade fält med validering, inte fri HTML, så kan layouten inte gå sönder.",
  ],
  sections: [
    {
      id: "problemet",
      heading: "Problemet: varje textändring blir ett ärende",
      blocks: [
        {
          type: "p",
          text: "En Next.js-sajt byggs ofta snabbast med texterna direkt i JSX. Det fungerar fram till lansering. Sedan vill frisören byta öppettider, snickaren lägga till en referens och caféet uppdatera lunchmenyn, och varje ändring blir ett mejl till dig.",
        },
        {
          type: "p",
          text: "För kunden betyder det väntetid och ofta en faktura för fem minuters arbete (mer om det i [vad en textändring kostar](/guider/vad-kostar-en-textandring)). För dig betyder det avbrott i annat arbete. Lösningen är inte att ge kunden tillgång till repot, utan att separera innehåll från kod.",
        },
      ],
    },
    {
      id: "alternativen",
      heading: "Alternativen jämförda",
      blocks: [
        {
          type: "p",
          text: "Gratisnivåerna nedan gäller enligt respektive leverantörs prissida i oktober 2026. Priser ändras, så kontrollera innan du lovar kunden något.",
        },
        {
          type: "table",
          caption: "CMS-alternativ för en liten Next.js-sajt (oktober 2026)",
          head: ["Alternativ", "Typ", "Var innehållet bor", "Vad kunden ser", "Gratisnivå", "Passar när"],
          rows: [
            [
              "Sanity",
              "Headless SaaS",
              "Sanitys molndatabas",
              "Sanity Studio, kan bäddas in som route i din app",
              "Free: 0 kr, 20 användare, 10 000 dokument",
              "Du vill ha flexibla scheman och visuell redigering",
            ],
            [
              "Storyblok",
              "Headless SaaS",
              "Storybloks moln",
              "Visual Editor med sajten i en iframe",
              "Starter: 0 kr, 1 användare (max 2)",
              "Kunden vill klicka direkt i sidan",
            ],
            [
              "Payload",
              "Self-hosted, öppen källkod",
              "Din egen databas (MongoDB, Postgres eller SQLite)",
              "Adminpanel i samma Next.js-app",
              "Mjukvaran är gratis, du betalar drift och databas",
              "Du vill äga allt och klarar driften",
            ],
            [
              "TinaCMS",
              "Git-baserat",
              "Markdown/JSON i repot",
              "Redigering med förhandsvisning",
              "TinaCloud Free: 2 användare, eller self-hosted",
              "Innehållet ska versioneras i git",
            ],
            [
              "Decap CMS",
              "Git-baserat, öppen källkod",
              "Filer i repot (GitHub, GitLab, Bitbucket)",
              "Admin-app i webbläsaren",
              "Gratis (MIT), kräver git-inloggning",
              "Enkel blogg eller statisk sajt",
            ],
            [
              "JSON-filer + egen admin",
              "Eget bygge",
              "Där du väljer",
              "Det du bygger",
              "Gratis, men din tid kostar",
              "Mycket små behov, eller du säljer det som tjänst",
            ],
            [
              "sitecms",
              "Strukturerade fält, SaaS",
              "sitecms",
              "Formulär per sida, nyheter, tjänster, SEO",
              "Gratis att börja",
              "Next.js App Router och kunden ska ändra text, bild och priser",
            ],
          ],
        },
        { type: "h3", text: "Vad tabellen inte säger" },
        {
          type: "ul",
          items: [
            "**Sanity** kan köras som en route i appen (`app/studio/[[...tool]]/page.tsx`) och har en egen guide för visuell redigering med App Router. Betalnivån Growth kostar 15 USD per användare och månad enligt [Sanitys prissida](https://sanity.io/pricing), oktober 2026.",
            "**Storyblok** passar kunder som tänker visuellt. Starter beskrivs som en plan för test och personliga projekt, och nästa nivå (Growth) kostar 99 USD i månaden enligt [Storybloks prissida](https://storyblok.com/pricing), oktober 2026.",
            "**Contentful** har dokumenterat stöd för live preview i App Router. Jämför gratisplanens gränser och nästa prisnivå på deras prissida innan du väljer det för en liten kund.",
            "**Payload** installeras i `/app` med en egen route group och kräver vissa Next.js-versioner enligt [installationsguiden](https://payloadcms.com/docs/getting-started/installation). Du ansvarar själv för backup och uppdateringar.",
            "**TinaCMS** har en guide för App Router, där sidan delas i en serverrenderad del och en klientkomponent för redigering. **Decap** (tidigare Netlify CMS) har en Next.js-guide som bygger på Pages Router och statisk export.",
            "**sitecms** är en ny produkt, fungerar bara med Next.js App Router och ger strukturerade fält snarare än en fri sidbyggare. Vill kunden bygga nya sidlayouter själv är det fel verktyg.",
          ],
        },
      ],
    },
    {
      id: "caching-och-revalidering",
      heading: "Så syns ändringen direkt: cache-taggar och revalidateTag",
      blocks: [
        {
          type: "p",
          text: "Med App Router renderas sidorna oftast statiskt vid build. Hämtar du CMS-innehållet med `fetch` och en tagg kan du tömma just det innehållet när kunden sparar, utan att bygga om sajten.",
        },
        {
          type: "code",
          lang: "ts",
          filename: "lib/cms.ts",
          code: `export async function getPage(slug: string) {
  const res = await fetch(\`\${process.env.CMS_URL}/pages/\${slug}\`, {
    cache: "force-cache",
    next: { tags: ["cms"] },
  });
  if (!res.ok) throw new Error(\`CMS svarade \${res.status}\`);
  return res.json();
}`,
        },
        {
          type: "code",
          lang: "ts",
          filename: "app/api/revalidate/route.ts",
          code: `import { revalidateTag } from "next/cache";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (body?.secret !== process.env.CMS_REVALIDATE_SECRET) {
    return Response.json({ revalidated: false }, { status: 401 });
  }
  // Webhook från CMS:et: nästa besökare får det nya innehållet.
  revalidateTag("cms", { expire: 0 });
  return Response.json({ revalidated: true });
}`,
        },
        {
          type: "p",
          text: "Peka CMS:ets webhook mot `/api/revalidate` och skicka hemligheten i body. Enligt [Next.js-dokumentationen](https://nextjs.org/docs/app/api-reference/functions/revalidateTag), oktober 2026, tar `revalidateTag` ett andra argument: `\"max\"` visar gammalt innehåll medan nytt hämtas i bakgrunden, medan `{ expire: 0 }` gör att nästa anrop väntar på färskt innehåll. Den äldre formen med bara taggen är markerad som utfasad. Kör du Next.js 15 tar funktionen bara taggen: skriv då `revalidateTag(\"cms\")`.",
        },
        {
          type: "tip",
          title: "Varför force-cache?",
          text: "Enligt [dokumentationen för fetch](https://nextjs.org/docs/app/api-reference/functions/fetch) är cachning opt-in. Med `cache: \"force-cache\"` och en tagg blir det tydligt vad som cachas och vad webhooken tömmer.",
        },
      ],
    },
    {
      id: "exempel-sitecms-next",
      heading: "Exempel: koppla sajten med sitecms-next",
      blocks: [
        {
          type: "p",
          text: "Så här ser samma mönster ut med sitecms, som bygger på just cache-taggar. Installera paketet och lägg in miljövariablerna från panelen.",
        },
        { type: "code", lang: "bash", code: "npm install sitecms-next" },
        {
          type: "p",
          text: "Revalidate-routen är en rad. När kunden sparar töms cachetaggen `sitecms`.",
        },
        {
          type: "code",
          lang: "ts",
          filename: "app/api/sitecms/revalidate/route.ts",
          code: `export { POST } from "sitecms-next/revalidate";`,
        },
        { type: "p", text: "Deklarera de fält kunden får redigera:" },
        {
          type: "code",
          lang: "ts",
          filename: "sitecms.config.ts",
          code: `import { defineConfig } from "sitecms-next";

export default defineConfig({
  pages: [
    {
      slug: "home",
      title: "Startsida",
      blocks: [
        { key: "hero.title", label: "Rubrik", help: "Max 60 tecken", default: "Välkommen" },
        { key: "hero.image", type: "image", label: "Hero-bild" },
        { key: "intro.body", type: "richtext", label: "Ingress" },
      ],
    },
  ],
});`,
        },
        {
          type: "p",
          text: "Synka strukturen före varje build. Kundens innehåll skrivs aldrig över, nya fält får sitt default-värde.",
        },
        {
          type: "code",
          lang: "json",
          filename: "package.json",
          code: `{ "scripts": { "prebuild": "sitecms-next sync" } }`,
        },
        { type: "p", text: "Läs innehållet i en serverkomponent:" },
        {
          type: "code",
          lang: "tsx",
          filename: "app/page.tsx",
          code: `import { block, getContent, image, text } from "sitecms-next";

export default async function Home() {
  const content = await getContent();
  const hero = image(content, "home", "hero.image");
  return (
    <main>
      <h1>{text(content, "home", "hero.title", "Välkommen")}</h1>
      {hero ? <img src={hero.src} alt={hero.alt} /> : null}
      <div dangerouslySetInnerHTML={{ __html: block(content, "home", "intro.body").html }} />
    </main>
  );
}`,
        },
        {
          type: "p",
          text: "Sedan bjuder du in kunden som redaktör via e-post. Hela uppsättningen, med `getPosts()` för nyheter och `seo()` för metadata, finns i [dokumentationen](/docs).",
        },
      ],
    },
    {
      id: "tank-pa",
      heading: "Vad du ska tänka på innan kunden får inloggningen",
      blocks: [
        {
          type: "ul",
          items: [
            "**Strukturerade fält, inte fri HTML.** En rubrik är ett textfält med hjälptext och maxlängd, en bild är ett bildfält. Då kan kunden inte råka förstöra layouten.",
            "**Validering.** Obligatoriska fält, längdgränser och rimliga standardvärden gör att en tom eller för lång text inte syns på sajten.",
            "**Förhandsvisning.** Kunder som ändrar mycket vill se resultatet innan det publiceras. Sanity, Storyblok och TinaCMS har visuell redigering; andra visar ändringen först på sajten.",
            "**Roller.** Kunden ska vara redaktör, inte admin. Strukturen och API-nycklarna ägs av den som underhåller sajten.",
            "**Alt-text.** Gör alt-text till ett eget fält bredvid varje bild och förklara varför det spelar roll.",
            "**Ångra.** Kontrollera hur man återställer en ändring: versionshistorik, git-historik eller ångra-funktion.",
          ],
        },
        {
          type: "p",
          text: "När allt fungerar: gå igenom [överlämningschecklistan](/guider/overlamna-hemsida-till-kund) och visa kunden hur det går till. Har kunden redan en sajt byggd i Next.js och vill förstå sina alternativ finns [en guide skriven för dem](/guider/andra-hemsida-byggd-i-nextjs).",
        },
      ],
    },
  ],
  faq: [
    {
      q: "Vilket CMS passar en liten Next.js-sajt?",
      a: "Ska kunden bara ändra texter, bilder och priser räcker ett CMS med strukturerade fält. Vill kunden klicka direkt i sidan är Storyblok eller Sanity med visuell redigering starka val. Vill du äga allt själv passar Payload, och vill du ha innehållet i git passar TinaCMS.",
    },
    {
      q: "Måste jag bygga om sajten för att lägga till ett CMS?",
      a: "Nej. Komponenterna och layouten blir kvar, du byter bara hårdkodade strängar mot värden som hämtas från CMS:et. Börja med de sidor kunden faktiskt ändrar och låt resten vara.",
    },
    {
      q: "Hur får jag ändringar att synas direkt med App Router?",
      a: "Hämta innehållet med fetch och en cache-tagg, och skapa en route handler som kör revalidateTag när CMS:ets webhook anropar den. Då töms bara det taggade innehållet och sajten behöver inte byggas om.",
    },
    {
      q: "Vad kostar ett headless CMS för en liten kund?",
      a: "Flera har gratisnivåer som räcker för en liten sajt, till exempel Sanitys Free-plan och Storybloks Starter enligt deras prissidor i oktober 2026. Begränsningarna gäller ofta antal användare, så kontrollera dem innan du väljer.",
    },
  ],
  sources: [
    { title: "Sanity – Pricing", url: "https://sanity.io/pricing" },
    { title: "Sanity – Embedding Sanity Studio in Next.js", url: "https://www.sanity.io/docs/nextjs/embedding-sanity-studio-in-nextjs" },
    { title: "Sanity – Visual Editing with Next.js App Router", url: "https://www.sanity.io/docs/nextjs/visual-editing-with-next-js-app-router" },
    { title: "Storyblok – Pricing", url: "https://storyblok.com/pricing" },
    { title: "Storyblok – Visual Editor", url: "https://www.storyblok.com/docs/concepts/visual-editor" },
    { title: "Contentful – Live updates", url: "https://www.contentful.com/developers/docs/tutorials/preview/live-updates" },
    { title: "Payload – Installation", url: "https://payloadcms.com/docs/getting-started/installation" },
    { title: "Payload – Open source", url: "https://payloadcms.com/blog/open-source" },
    { title: "TinaCMS – Pricing", url: "https://tina.io/pricing" },
    { title: "TinaCMS – Self-hosted overview", url: "https://tina.io/docs/reference/self-hosted/overview" },
    { title: "TinaCMS – Next.js App Router", url: "https://tina.io/docs/frameworks/next/app-router" },
    { title: "Decap CMS – Introduction", url: "https://decapcms.org/docs/intro/" },
    { title: "Decap CMS – Next.js", url: "https://decapcms.org/docs/nextjs/" },
    { title: "Next.js – revalidateTag", url: "https://nextjs.org/docs/app/api-reference/functions/revalidateTag" },
    { title: "Next.js – fetch", url: "https://nextjs.org/docs/app/api-reference/functions/fetch" },
  ],
  related: ["overlamna-hemsida-till-kund", "andra-hemsida-byggd-i-nextjs", "vad-kostar-en-textandring"],
  cta: "utvecklare",
};

export default guide;
