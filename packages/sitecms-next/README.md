# sitecms-next

Koppla en sajt till [sitecms](https://sitecms.se) med **en miljövariabel och
ett kommando**: typad klient, signerad revalidate-route för Next.js App Router,
live-förhandsgranskning i panelen, offertförfrågningar med bilagor, cookiefri
trafikmätning och CLI för schema-sync. Inga beroenden.

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
- skapar preview-routen `app/api/sitecms/preview/route.ts` och skriver ut resten av
  stegen för [live-förhandsgranskning](#live-förhandsgranskning) (layouten ändras inte),
- skapar events-routen `app/api/sitecms/events/route.ts` för [trafik](#trafik) och
  skriver ut raden för layouten,
- skapar `sitecms.config.ts` — från strukturen som redan finns i sitecms, annars ett kort exempel,
- lägger till `"prebuild": "sitecms-next sync"` i `package.json` (om inget script
  redan kör `sitecms-next sync`, t.ex. `build`) och synkar direkt.

Det går att köra flera gånger. Exakt vad som rörs:

- **Skrivs aldrig över:** revalidate-, preview- och events-routen och `sitecms.config.*` —
  finns de redan hoppas steget över. `app/layout.tsx` och `next.config.*` rörs aldrig.
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

## Live-förhandsgranskning

När kunden redigerar en sida i panelen visas den riktiga sajten i en iframe
bredvid fälten och uppdateras medan hen skriver — innan något sparas. Klick på
ett markerat element hoppar till fältet. Kräver Next.js App Router (14.2+) och
sitecms-next 0.4+. Statiska sidor förblir statiska; bara den som förhandsgranskar
får dynamiskt renderade sidor.

**1. Routen** (skapas av `npx sitecms-next init`):

```ts
// app/api/sitecms/preview/route.ts
export { GET } from "sitecms-next/preview";
```

**2. Komponenten**, sist i `<body>` i `app/layout.tsx`:

```tsx
import { SitecmsPreview } from "sitecms-next/preview";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body>
        {children}
        <SitecmsPreview />
      </body>
    </html>
  );
}
```

Den renderar ingenting om draft mode inte är på.

**3. Markera redigerbara element** med `editable(sida, fält)`:

```tsx
import { editable, getContent, text } from "sitecms-next";

const content = await getContent();
<h1 {...editable("home", "hero.title")}>{text(content, "home", "hero.title")}</h1>
// → <h1 data-sitecms="home:hero.title">
```

Fungerar även i klientkomponenter. Attributet är ofarligt i produktion. Text
uppdateras direkt medan kunden skriver om elementet bara innehåller texten (inga
barnelement); bilder (`<img>` eller första `<img>` inuti) byter `src` direkt.
Allt annat (t.ex. richtext) uppdateras när panelen laddar om sidan, ungefär
0,4 s efter att kunden slutat skriva.

**4. Låt panelen bädda in sajten** i `next.config.ts` (eller `.mjs`):

```ts
import { previewFrameHeaders } from "sitecms-next/preview";

const nextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: previewFrameHeaders() }];
  },
};
export default nextConfig;
```

`previewFrameHeaders()` ger `Content-Security-Policy: frame-ancestors 'self' https://sitecms.se https://www.sitecms.se`
(origin för `CMS_API_URL` i stället för `https://sitecms.se` om den är satt). Egna
origins: `previewFrameHeaders(["https://panel.example"])`. **Ta bort
`X-Frame-Options`** om sajten sätter den — CSP:n ersätter den.

**5. Fyll i adressen** under Inställningar → "Adress för förhandsgranskning" i
panelen om sajten inte ligger på sin domän än (t.ex. en Vercel-URL).

Så fungerar det: panelen öppnar `/api/sitecms/preview?token=…&path=/` i
iframen. Routen verifierar token mot sitecms (`GET /api/v1/site/preview`), slår
på draft mode och sätter cookies som fungerar i en iframe från en annan domän
(`Partitioned; SameSite=None; Secure`; på `http://localhost` i stället
`SameSite=Lax` utan `Secure`). `getContent()` hämtar då innehållet med
osparade ändringar (header `x-sitecms-preview`, utan cache); är förhandsgranskningen
utgången eller sitecms inte svarar visas sparat innehåll — sajten går aldrig
sönder. Öppnas routen utanför panelen visas en liten bar "Förhandsgranskning ·
Avsluta" längst ner; `?disable=1` stänger av.

> **Lokalt mot en lokal sitecms:** panel och sajt får inte båda ligga på
> `localhost` (cookies gäller per värd, inte per port — panelen raderar då
> sajtens draft mode-cookie och previewn slutar uppdateras efter första
> ändringen). Mot sitecms.se, eller med sajten på en annan värd, fungerar det.

| Export | |
|---|---|
| `GET` / `createPreviewRoute({ apiKey?, apiUrl?, site?, fetch? })` | Preview-routen (läser `CMS_API_KEY`, `CMS_API_URL`, `CMS_SITE` som klienten) |
| `<SitecmsPreview routePath? />` | Async serverkomponent för layouten |
| `previewFrameHeaders(panelOrigins?)` | Headers för `next.config` |
| `isPreview()` | `true` när sidan visas i förhandsgranskningen (finns även i `sitecms-next`) |
| `editable(page, key)` (från `sitecms-next`) | `{ "data-sitecms": "page:key" }` |

`page` och `key` får bara innehålla a–z, 0–9, punkt, bindestreck och
understreck. `createSitecms({ previewToken })` styr varifrån preview-token
läses (en funktion, eller `false` för att stänga av förhandsgranskning för en
klient). Meddelandeprotokollet (postMessage, v1) beskrivs i sitecms-dokumentationen.

## Offertförfrågningar

Skicka sajtens offertformulär till sitecms så att förfrågningarna hamnar under
**Förfrågningar** i panelen och företaget får mejl (kunden får ett kvitto).
Anropen bär API-nyckeln och görs därför bara på serversidan — i en server
action eller route handler; i webbläsaren kastar funktionerna ett tydligt fel.
Sajten gör spamkontrollerna som kräver webbläsaren (honeypot, tidsfälla) innan
den anropar sitecms, som validerar alla fält igen, rate-limitar per `ipHash`
(5 förfrågningar/h), sparar och mejlar. Förfrågningar raderas efter 12 månader.

Fyll i **E-post för förfrågningar** under Inställningar för sajten i panelen —
annars sparas förfrågan men inga mejl går ut (`emailStatus: "skipped"`).

```ts
// app/offert/actions.ts
"use server";

import { headers } from "next/headers";
import { SitecmsError, hashIp, submitQuoteRequest, uploadQuoteAttachment } from "sitecms-next";

export type OffertResultat =
  | { ok: true; id: string }
  | { ok: false; fel: string; falt?: Record<string, string> };

export async function skickaOffert(formData: FormData): Promise<OffertResultat> {
  // 1. Honeypot: fältet är dolt för människor — ifyllt betyder bot. Låtsas lyckas.
  if (formData.get("webbplats")) return { ok: true, id: "" };

  // 2. Tidsfälla: formuläret renderades med `started=Date.now()`; under 3 s är en bot.
  const started = Number(formData.get("started") ?? 0);
  if (!started || Date.now() - started < 3_000) return { ok: true, id: "" };

  // 3. ipHash: saltad hash av IP:n, så att sitecms kan rate-limita utan att se adressen.
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const ipHash = await hashIp(ip, process.env.CMS_IP_SALT!);

  try {
    // 4. Bilagor först (jpg/png/webp/heic/pdf, max 10 MB per fil, max 10 st) …
    const filer = formData.getAll("bilder").filter((f): f is File => f instanceof File && f.size > 0);
    const attachments = await Promise.all(filer.map((f) => uploadQuoteAttachment(f, f.name, { ipHash })));

    // 5. … sedan själva förfrågan.
    const { id } = await submitQuoteRequest({
      name: String(formData.get("namn") ?? ""),
      phone: String(formData.get("telefon") ?? ""),
      email: String(formData.get("epost") ?? ""),
      jobType: String(formData.get("typ") ?? ""),
      description: String(formData.get("beskrivning") ?? ""),
      consent: formData.get("samtycke") === "on",
      customerType: (formData.get("kundtyp") as "privat" | "foretag" | null) || null,
      budget: String(formData.get("budget") ?? "") || null,
      rot: formData.get("rot") === "on",
      postalCode: String(formData.get("postnummer") ?? "") || null,
      desiredStart: String(formData.get("start") ?? "") || null,
      source: String(formData.get("kalla") ?? "") || null, // referrer/utm från klienten
      attachments,
      extra: { takyta: String(formData.get("takyta") ?? "") }, // egna fält, visas som tabell
      ipHash,
    });
    return { ok: true, id };
  } catch (err) {
    if (err instanceof SitecmsError && err.status === 400) {
      // Fältfel på svenska: { phone: "Ange ett svenskt telefonnummer…", … }
      // Mappa sitecms fältnamn till formulärets.
      const namn: Record<string, string> = { name: "namn", phone: "telefon", email: "epost", jobType: "typ", description: "beskrivning", consent: "samtycke", postalCode: "postnummer", customerType: "kundtyp", desiredStart: "start" };
      const falt = Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [namn[k] ?? k, v]));
      return { ok: false, fel: "Kontrollera fälten nedan.", falt };
    }
    if (err instanceof SitecmsError && (err.status === 429 || err.status === 413)) {
      return { ok: false, fel: err.message }; // serverns svenska meddelande
    }
    console.error("offert:", err);
    return { ok: false, fel: "Något gick fel. Försök igen eller ring oss." };
  }
}
```

| Export | |
|---|---|
| `submitQuoteRequest(input, { signal? })` | `POST …/quote-requests` → `{ id, emailStatus: "sent" \| "failed" \| "skipped" }` |
| `uploadQuoteAttachment(file, name, { contentType?, ipHash?, signal? })` | `POST …/quote-requests/attachments` → `{ url, name, contentType, size }` |
| `hashIp(ip, salt)` | SHA-256 hex av `salt:ip` (Web Crypto) för `ipHash` |
| `SitecmsError` | `status` (400/413/429/…, `0` när sitecms inte nås) och `fields` (fältnamn → svenskt fel vid 400) |
| Typer | `QuoteRequestInput`, `QuoteRequestResult`, `QuoteAttachment`, `QuoteCustomerType` |

Fält i `QuoteRequestInput`: `name` (2–100), `phone` (svenskt nummer), `email`,
`jobType`, `description` (10–3000) och `consent: true` krävs. Valfria:
`company`, `machine`, `location`, `desiredStart` (YYYY-MM-DD), `customerType`
(`"privat"` | `"foretag"`), `budget` (max 100), `rot`, `postalCode` (max 10),
`source` (max 500), `attachments` (max 10) och `extra` (nyckel
`^[a-zA-Z0-9_.-]{1,50}$` → text max 500, max 20 st; tomma värden kastas).
Finns även på klienten: `createSitecms(...).submitQuoteRequest()` m.fl.

## Trafik

Besökare, sidvisningar, sidor, källor, länder och enheter visas i panelen under
**SEO & Trafik** — utan cookies, utan skript från tredje part och utan
cookie-meddelande. Kräver Next.js App Router och sitecms-next 0.6+. Två rader:

**1. Routen** (skapas av `npx sitecms-next init`):

```ts
// app/api/sitecms/events/route.ts
export { POST } from "sitecms-next/analytics";
```

**2. Komponenten**, sist i `<body>` i `app/layout.tsx`:

```tsx
import { SitecmsAnalytics } from "sitecms-next/analytics";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body>
        {children}
        <SitecmsAnalytics />
      </body>
    </html>
  );
}
```

Deploya. Inga nya miljövariabler — routen använder samma `CMS_API_KEY`.

Så fungerar det: komponenten skickar `{ p, r, q }` (sökväg, referer, utm-query)
till sajtens egen route vid första laddningen och vid varje byte av pathname
(inte vid ändrad query eller hash), med `navigator.sendBeacon` och annars
`fetch` med `keepalive`. Routen lägger till IP (`x-forwarded-for`/`x-real-ip`),
user agent och land (`x-vercel-ip-country`/`cf-ipcountry`) från anropet och
skickar vidare till `POST …/events` med API-nyckeln — nyckeln når aldrig
webbläsaren. Routen svarar **alltid 204** till webbläsaren, även om sitecms
svarar fel (en `console.warn`, högst en per process) och även utan
`CMS_API_KEY` (då skickas inget vidare).

**Vad som mäts:** sidvisningar och unika besökare per dag (UTC), fördelade på
sida, källa (`direkt`, `utm:<utm_source>`, `google`, `linkedin`,
`ai:chatgpt`, `ref:<domän>` …), land och enhet (mobil/surfplatta/dator).

**Vad som inte lagras:** IP, user agent, tidsstämplar eller råevents. Unika
besökare räknas med `sha256(salt:dag:sajt:ip:ua)` — hashen byts varje dag, så
ingen kan följas över tid. Robotar (Googlebot, Lighthouse, curl …) filtreras
bort. Inga cookies, ingen `localStorage`.

**Inget skickas** i förhandsgranskningen (draft mode — `<SitecmsAnalytics />`
renderar null, så panelens klick aldrig räknas), från `localhost`/`127.0.0.1`,
när `navigator.webdriver` är satt, eller för samma pathname två gånger i rad.

| Export | |
|---|---|
| `POST` / `createAnalyticsRoute({ apiKey?, apiUrl?, site?, fetch? })` | Events-routen (läser `CMS_API_KEY`, `CMS_API_URL`, `CMS_SITE` som klienten; `fetch` för tester) |
| `<SitecmsAnalytics endpoint? />` | Async serverkomponent för layouten; `endpoint` default `/api/sitecms/events` |
| `ANALYTICS_ROUTE_PATH` | `"/api/sitecms/events"` |
| `isPreview()` | Samma som i `sitecms-next/preview` |
| `shouldTrack(pathname, prev, hostname, webdriver)`, `utmQuery(search)` | Rena hjälpfunktioner från `sitecms-next/analytics-client` (testbara utan DOM) |

`sitecms-next/analytics-client` (`"use client"`) exporterar `SitecmsAnalyticsClient`
direkt, men använd `<SitecmsAnalytics />` så att inget skickas i förhandsgranskningen.

Felsökning — syns ingen trafik i panelen: öppna sajten med nätverksfliken
öppen. `POST /api/sitecms/events` ska svara `204` vid varje sidbyte. `404` →
routen saknas (kör `npx sitecms-next init` igen). Inget anrop → komponenten
saknas i layouten, eller du är på localhost/i förhandsgranskningen. `204` men
inget i panelen → `CMS_API_KEY` saknas hos webbhotellet eller hör till en annan
sajt (serverloggen visar `sitecms: trafikpixeln fick 401 …`; kör
`npx sitecms-next check`).

## Miljövariabler

| Variabel | |
|---|---|
| `CMS_API_KEY` | **Krävs.** Identifierar sajten. Finns under Integration i panelen. |
| `CMS_API_URL` | Valfri. Default `https://sitecms.se`. |
| `CMS_SITE` | Valfri. Satt → äldre slug-routes `/api/v1/sites/<slug>/…` (som 0.2.x). |
| `CMS_REVALIDATE_SECRET` | Valfri. Äldre revalidate-hemlighet, godkänns fortfarande. |
| `SITE_URL` / `CMS_SITE_URL` | Valfri. Sajtens adress, skickas vid sync (se ovan). |
| `CMS_IP_SALT` | Valfri (ditt eget namn). Salt till `hashIp()` för offertförfrågningar — läses inte av paketet. |

## Uppgradera från 0.5

```bash
npm install sitecms-next@^0.6.0
```

Inget behöver ändras — 0.6 lägger bara till [trafik](#trafik)
(`sitecms-next/analytics`). Utan events-routen och `<SitecmsAnalytics />`
fungerar sajten exakt som förut. Vill du ha trafiken i panelen: kör
`npx sitecms-next init` igen (skapar routen) och lägg komponenten i layouten.
Se [CHANGELOG.md](./CHANGELOG.md).

## Uppgradera från 0.4

```bash
npm install sitecms-next@^0.5.0
```

Inget behöver ändras — 0.5 lägger bara till [offertförfrågningar](#offertförfrågningar)
(`submitQuoteRequest`, `uploadQuoteAttachment`, `hashIp`) och fältet `fields` på
`SitecmsError`. Se [CHANGELOG.md](./CHANGELOG.md).

## Uppgradera från 0.3

```bash
npm install sitecms-next@^0.5.0
```

Inget behöver ändras — allt nytt i 0.4 är tillägg. Utan preview-routen och
`<SitecmsPreview />` fungerar sajten exakt som förut. Vill du ha
live-förhandsgranskning: kör `npx sitecms-next init` igen (skapar preview-routen
och skriver ut stegen) eller följ [Live-förhandsgranskning](#live-förhandsgranskning).
Se även [CHANGELOG.md](./CHANGELOG.md).

## Uppgradera från 0.2

```bash
npm install sitecms-next@^0.4.0
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
| `sitecms-next init [nyckel] [--force] [--no-install]` | Kopplar projektet (se ovan), inkl. preview- och events-routen |
| `sitecms-next sync [--prune] [--strict] [--config <fil>]` | Synkar configen till sitecms |
| `sitecms-next check` | Verifierar nyckeln och visar webhook-status |
| `sitecms-next pull` | Skriver ut strukturen i sitecms som JSON |

Dokumentation: https://sitecms.se/docs

MIT
