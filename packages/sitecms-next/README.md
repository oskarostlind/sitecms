# sitecms-next

Koppla en sajt till [sitecms](https://sitecms.se) med **en miljövariabel och
ett kommando**: typad klient, signerad revalidate-route för Next.js App Router
och CLI för schema-sync. Inga beroenden.

## Kom igång

```bash
npx sitecms-next init
```

Kör kommandot i projektets rotkatalog (där `package.json` finns). Klistra in
API-nyckeln från **Integration** för sajten i sitecms-panelen (eller kör
`npx sitecms-next init <nyckel>`). Kommandot:

- kontrollerar `package.json` och nyckeln mot sitecms innan något skrivs,
- sparar `CMS_API_KEY` i `.env.local` (och ser till att `.gitignore` täcker den),
- installerar `sitecms-next` om det saknas,
- skapar revalidate-routen `app/api/sitecms/revalidate/route.ts` (eller under `src/app`),
- skapar `sitecms.config.ts` — från strukturen som redan finns i sitecms, annars ett kort exempel,
- lägger till `"prebuild": "sitecms-next sync"` i `package.json` (om inget script
  redan kör `sitecms-next sync`, t.ex. `build`) och synkar direkt.

Det går att köra flera gånger. Exakt vad som rörs:

- **Skrivs aldrig över:** revalidate-routen och `sitecms.config.*` — finns de
  redan hoppas steget över.
- **Kompletteras:** `.env.local` (raden `CMS_API_KEY=…` läggs till),
  `.gitignore` (raden `.env.local` läggs till om den inte redan täcks) och
  `package.json` (bara `scripts.prebuild` ändras; indrag, radslut, BOM och
  resten av filen lämnas som de var). Andra rader rörs inte.
  Paketinstallationen (`npm install` m.fl.) uppdaterar `package.json` och
  lockfilen som vanligt.
- **Annan nyckel:** finns redan en annan `CMS_API_KEY` i `.env.local` frågar
  init innan den ersätts (i terminal), annars krävs `--force`. Den gamla raden
  raderas inte utan kommenteras ut:
  `# CMS_API_KEY=… (ersatt av sitecms-next init <datum>)`.
- **Ingen `package.json`:** init avbryter utan att skriva något.
  `--force` sparar ändå `CMS_API_KEY` i `.env.local` (och `.env.local` i
  `.gitignore`) och hoppar över resten. En `package.json` som inte är giltig
  JSON stoppar alltid init innan något skrivs.

**Sedan:** lägg `CMS_API_KEY=…` som miljövariabel hos ditt webbhotell (Vercel,
Netlify, Cloudflare, egen server …) och deploya. Klart.

### Revalidate-URL:en sätts av produktionsbygget

När bygget körs hos webbhotellet skickar `sitecms-next sync` sajtens adress
(`siteUrl`) till sitecms, som då sätter revalidate-URL:en
`<adress>/api/sitecms/revalidate` — **bara om den är tom**; befintliga
inställningar skrivs aldrig över. Därför skickas adressen bara när bygget ser ut
som produktion, så att en preview-adress aldrig fastnar:

| Variabel | Skickas när |
|---|---|
| `CMS_SITE_URL` | alltid (uttryckligen satt) |
| `SITE_URL` | alltid (uttryckligen satt) |
| `VERCEL_PROJECT_PRODUCTION_URL` | `VERCEL_ENV=production` |
| `URL` (Netlify) | `CONTEXT=production` |
| `RENDER_EXTERNAL_URL` | `IS_PULL_REQUEST` är inte `true` |

Den första som gäller används. Byggloggen visar varifrån adressen kom, eller
varför en variabel hoppades över (t.ex. `VERCEL_ENV=preview`).
`NEXT_PUBLIC_SITE_URL` används inte. Hos andra webbhotell: sätt
`SITE_URL=https://din-domän.se` i produktionsmiljön, eller fyll i
`https://din-domän.se/api/sitecms/revalidate` under Integration.

Revalidate-URL:en visas maskerad i loggar (`sync`, `check`, `init`): är
sökvägen `/api/sitecms/revalidate` visas adressen, annars bara
`https://värd/••••` — en deploy hook-URL är en hemlighet och byggloggar kan vara
publika.

Kontrollera kopplingen när som helst:

```bash
npx sitecms-next check
# ✔ Ansluten till "Kundens sajt" (kund) via https://sitecms.se — 4 sidor, senaste sync: …
# ✔ Revalidate-URL: https://kund.se/api/sitecms/revalidate — senaste anrop: ok (…)
```

## Använd innehållet

```tsx
import { block, getContent, image, text } from "sitecms-next";

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
}
```

Även `getPosts()`, `getPost(slug)`, `seo(content, pageSlug)` och `health()`.

### Flera sajter i samma projekt

Skapa en klient per sajt med dess nyckel:

```ts
import { createSitecms } from "sitecms-next";

const huvudsajt = createSitecms(); // CMS_API_KEY (+ CMS_SITE om den är satt, som 0.2)
const butik = createSitecms({ apiKey: process.env.BUTIK_CMS_API_KEY! });

const [content, butikContent] = await Promise.all([huvudsajt.getContent(), butik.getContent()]);
```

Anges `apiKey` men inte `site` läses `CMS_SITE` **inte** från miljön — nyckeln
identifierar sajten (`/api/v1/site/…`). En extra klient krockar alltså inte med
en gammal `CMS_SITE` för projektets egen sajt. `CMS_API_URL` läses fortfarande
från miljön. `createSitecms()` utan argument (och `getContent()` m.fl.) använder
`CMS_SITE` precis som 0.2.x, och `createSitecms({ apiUrl, site, apiKey })`
fungerar som förut.

Alla anrop taggas med cache-taggen `sitecms`. När kunden sparar anropar sitecms
revalidate-routen, taggen töms och sajten visar det nya innehållet direkt — utan
ny deploy.

## Deklarera fälten

```ts
// sitecms.config.ts
import { defineConfig } from "sitecms-next";

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
});
```

`sitecms-next sync` (körs som `prebuild`) skapar saknade sidor och fält i
sitecms. Kundens innehåll skrivs aldrig över. Ogiltig config stoppar bygget.
Saknas `CMS_API_KEY` hoppas steget över med en tydlig varning i byggloggen
(använd `--strict` för att låta bygget faila).

## Miljövariabler

| Variabel | |
|---|---|
| `CMS_API_KEY` | **Krävs.** Identifierar sajten. Finns under Integration i panelen. |
| `CMS_API_URL` | Valfri. Default `https://sitecms.se`. |
| `CMS_SITE` | Valfri. Satt → äldre slug-routes `/api/v1/sites/<slug>/…` (som 0.2.x). |
| `CMS_REVALIDATE_SECRET` | Valfri. Äldre revalidate-hemlighet, godkänns fortfarande. |
| `SITE_URL` / `CMS_SITE_URL` | Valfri. Sajtens adress, skickas vid sync (se ovan). |

## Uppgradera från 0.2

```bash
npm install sitecms-next@^0.3.0
```

Inget annat behöver ändras: `CMS_API_URL`, `CMS_SITE` och
`CMS_REVALIDATE_SECRET` fungerar precis som tidigare (samma routes, samma
hemlighet). De kan tas bort när du vill — då räcker `CMS_API_KEY`:

- `CMS_API_URL` — default är `https://sitecms.se`.
- `CMS_SITE` — nyckeln identifierar sajten.
- `CMS_REVALIDATE_SECRET` — revalidate-routen godkänner sitecms signerade anrop
  (`x-sitecms-signature`) med `CMS_API_KEY`. Se till att `CMS_API_KEY` finns hos
  webbhotellet innan du tar bort hemligheten.

`createSitecms({ apiUrl, site, apiKey })` och `createRevalidateHandler({ secret })`
fungerar som förut.

Kör du `npx sitecms-next init` i ett 0.2-projekt varnar den om `CMS_SITE` är
satt och föreslår att du tar bort den (i `.env.local` och hos webbhotellet).
Allt init gör använder nyckel-routerna, så en ny nyckel för en annan sajt
krockar inte med en gammal `CMS_SITE` — men sajten själv använder slug-routerna
så länge `CMS_SITE` finns kvar. Init tar inte bort variabeln åt dig.

## Inte Next.js? Använd en deploy hook

Klienten (`createSitecms`, `getContent` …) fungerar i alla JavaScript-miljöer med
`fetch`, och `sitecms-next sync` i alla Node-projekt. För att sajten ska uppdateras
när kunden sparar i ett statiskt bygge (Astro, Eleventy, Nuxt, Vite …):

1. Skapa en deploy hook (build hook) hos webbhotellet — Netlify, Vercel,
   Cloudflare Pages och Render har alla en.
2. Klistra in hook-URL:en som **revalidate-URL** under Integration i sitecms-panelen.

sitecms POST:ar till URL:en när innehåll sparas och sajten byggs om.
`npx sitecms-next init` känner av projekt utan Next.js App Router och skapar då
ingen route.

## Egen mottagare: `verifyWebhook`

Vill du ta emot anropet själv (egen server, Pages Router, Edge-funktion …):

```ts
import { verifyWebhook } from "sitecms-next";

export async function POST(request: Request) {
  const rawBody = await request.text(); // läs bodyn en gång, oförändrad
  const ok = await verifyWebhook({ rawBody, headers: request.headers });
  if (!ok) return new Response("Fel signatur", { status: 401 });
  // … töm din cache / bygg om
  return Response.json({ ok: true });
}
```

`verifyWebhook({ rawBody, headers, apiKey?, legacySecret?, toleranceSeconds? })`
returnerar `Promise<boolean>`. `verifyWebhookDetailed(…)` tar samma argument och
returnerar `{ ok: true, method }` eller `{ ok: false, reason, message }`, där
`reason` är `"no-credentials"`, `"missing-signature"`, `"invalid-timestamp"`,
`"timestamp-out-of-range"` eller `"invalid-signature"`.
`"timestamp-out-of-range"` betyder att signaturen stämmer men att tidsstämpeln
avviker mer än 300 s — oftast fel klocka på servern. `headers` kan vara ett `Headers`-objekt eller ett
vanligt objekt (Express/Node). `apiKey` är som standard `CMS_API_KEY` och
`legacySecret` `CMS_REVALIDATE_SECRET`. Använder Web Crypto, så det fungerar i
Node och Edge.

Formatet: `x-sitecms-timestamp: <unix-sekunder>` och
`x-sitecms-signature: v1=<hex>[,v1=<hex>…]`, där `<hex>` är HMAC-SHA256 med
nyckeln `sha256hex(CMS_API_KEY)` (som UTF-8-sträng) över `` `${timestamp}.${rawBody}` ``.
Tidsstämpeln får avvika högst 300 sekunder.

Revalidate-routen för Next.js finns färdig:

```ts
// app/api/sitecms/revalidate/route.ts
export { POST } from "sitecms-next/revalidate";
```

Avvisas ett anrop svarar routen `401 { revalidated: false, error, reason }`. Vid
klockfel är `error` "Signaturen stämmer, men tidsstämpeln ligger utanför ±5 min
(…) — kontrollera serverns klocka.", så att det syns i panelens felrad.

## CLI

| Kommando | Gör |
|---|---|
| `sitecms-next init [nyckel] [--force] [--no-install]` | Kopplar projektet (se ovan) |
| `sitecms-next sync [--prune] [--strict] [--config <fil>]` | Synkar configen till sitecms |
| `sitecms-next check` | Verifierar nyckeln och visar webhook-status |
| `sitecms-next pull` | Skriver ut strukturen i sitecms som JSON |

Dokumentation: https://sitecms.se/docs

MIT
