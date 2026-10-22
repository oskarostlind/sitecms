# SEO & Trafik — arkitekturkontrakt

Mål: panelen visar **trafik** (egen cookiefri pixel) och en **SEO-poäng** med
konkreta åtgärder per sajt — i fliken "SEO & Trafik" och som siffror på
översikten. Ingen tredjepartsanalys, inga cookies, inget cookie-meddelande.

Kontraktet gäller fyra delar som byggs av olika agenter:

- **A — pixel & insamling**: `packages/sitecms-next` (0.6.0) + `POST /api/v1/site/events` + `lib/traffic.ts`.
- **B — SEO-poäng**: `lib/seo-score/*` + daglig cron.
- **C — panelen**: fliken, översikten och "Dina sajter".
- **D — dokumentation**: `/docs`, `llms.txt`, README, CHANGELOG, integrationssidan.

Ändra inte tabellnamn, routes, headers, body-format eller funktionssignaturer i
det här dokumentet utan att arkitekten godkänner. Allt är additivt — befintliga
sajter (sitecms-next 0.2–0.5) fungerar exakt som förut. Svensk UI-text,
engelska identifierare, kommentarer på svenska där koden redan är det.

---

## 1. Flöde (pixel)

```
Besökarens webbläsare            Kundsajten (Next)                    sitecms.se
───────────────────────          ──────────────────────────           ────────────────────────
<SitecmsAnalytics />
  (client, usePathname)
  POST /api/sitecms/events  ───► export { POST } from
  { p, r, q }                      "sitecms-next/analytics"
                                   + ip, ua, country från headers
                                   POST {api}/events  ───────────────► authenticateByKey
                                   x-api-key: CMS_API_KEY              bot-filter, validering
                                                                       visitor_hash = sha256(salt:day:siteId:ip:ua)
                                                                       upsert traffic_* (aggregat)
                                   ◄──── 204 ───────────────────────── 204
  ◄──── 204 ──────────────────
```

Varför via kundsajten: API-nyckeln är hemlig och får aldrig nå webbläsaren.
Routen på sajten är first-party (mindre blockering) och ger riktig IP och
Vercels geo-header. Samma mönster som revalidate- och preview-routen —
`npx sitecms-next init` skapar den.

Pixeln skickar **inget** i draft mode (`isPreview()` → komponenten renderar
null), inte på `localhost`, inte när `navigator.webdriver` är satt.

## 2. Databas (`drizzle-manual/0009_traffic_seo.sql`, redan skriven)

Aldrig råevents. Endast dagsaggregat + en kortlivad besökartabell.

| Tabell | Nyckel | Innehåll |
|---|---|---|
| `traffic_daily` | `(site_id, day)` | `views`, `visitors` — sajtens totaler per dag |
| `traffic_daily_dims` | `(site_id, day, dim, value)` | `views` per dimension. `dim` ∈ `path` \| `source` \| `country` \| `device` |
| `traffic_visitors` | `(site_id, day, visitor_hash)` | finns bara för att räkna unika; raderas av cron när `day < idag − 2` |
| `seo_scores` | unik `(site_id, day)` | `score`, `content_score`, `lighthouse_score` (null utan PSI), `tech_score` (reserverad, null), `findings` jsonb, `lighthouse` jsonb |

Drizzle-definitionerna ligger i `lib/db/schema.ts` (`trafficDaily`,
`trafficDailyDims`, `trafficVisitors`, `seoScores`). `day` är `date` (UTC).

Dimensionsvärden:
- `path`: pathname utan query/hash, max 200 tecken, `/` för start.
- `source`: `direkt` (ingen referer eller egen domän), `utm:<utm_source>`, annars `classifyReferrer(host)` från `lib/attribution.ts` (`google`, `linkedin`, `ai:chatgpt`, `ref:example.com` …).
- `country`: ISO 3166-1 alpha-2 versaler från `x-vercel-ip-country`/`cf-ipcountry`, annars `ZZ`.
- `device`: `mobile` | `tablet` | `desktop` från UA.

"Smart sparning": en sidvisning = en `db.batch` (neon-http) med 1 upsert i
`traffic_daily`, 4 upserts i `traffic_daily_dims`, 1 insert-on-conflict i
`traffic_visitors` (vars resultat avgör om `visitors` ökas). Max 100 views per
besökare och dag räknas; resten ignoreras tyst (spam-skydd). Max 500 distinkta
`path`-värden per sajt och dag; därefter bokförs sökvägen som `/…`.

## 3. API: `POST /api/v1/site/events` (del A)

Auth: `authenticateByKey` (header `x-api-key`), som övriga `/api/v1/site/*`.
Slug-variant `POST /api/v1/sites/[slug]/events` finns också (samma handler).

Body (JSON, max 4 kB):
```json
{
  "events": [
    { "p": "/om-oss", "r": "https://www.google.com/", "q": "utm_source=linkedin", "ua": "…", "ip": "1.2.3.4", "c": "SE", "t": 1730000000000 }
  ]
}
```
- `events`: 1–20 objekt. `p` krävs (sträng ≤ 2048, normaliseras). Övriga valfria.
- `ip`: kundsajtens route fyller i från `x-forwarded-for`/`x-real-ip`; saknas den används anropets IP. Används bara för hashen, lagras aldrig.
- `t`: ms-tidsstämpel; ignoreras om den avviker > 1 h från nu (dagen är alltid serverns UTC-dag).
- Svar: `204` (även när allt filtrerats bort). `400` ogiltig body, `401` nyckel, `413` för stor, `429` vid > 600 events/min per sajt (minnesräknare per instans räcker).
- Bot-filter: UA tom eller matchar `bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|curl|wget|python|node-fetch|go-http` → ignoreras.
- Header `Cache-Control: private, no-store`.

Visitor-hash: `sha256("${salt}:${day}:${siteId}:${ip}:${ua}")`, hex. `salt` =
`ANALYTICS_SALT` om satt, annars `AUTH_SECRET`. Ingen hash är reproducerbar
nästa dag → ingen spårning över tid.

## 4. `lib/traffic.ts` (del A skriver, del C läser)

```ts
export type TrafficDim = "path" | "source" | "country" | "device";
export type DayPoint = { day: string /* YYYY-MM-DD */; views: number; visitors: number };
export type TrafficSummary = {
  days: number;
  views: number; visitors: number;
  prevViews: number; prevVisitors: number;      // samma längd period före
  series: DayPoint[];                            // en punkt per dag, luckor = 0
  hasData: boolean;                              // någon rad någonsin för sajten
};

export async function recordPageviews(siteId: string, events: NormalizedEvent[]): Promise<void>;
export async function getTrafficSummary(siteId: string, days: 7 | 30): Promise<TrafficSummary>;
export async function getTrafficBreakdown(siteId: string, days: 7 | 30, dim: TrafficDim, limit?: number): Promise<{ value: string; views: number; share: number }[]>;
/** För listor: besökare per dag (7 dagar) för många sajter i en query. */
export async function getVisitorSeriesForSites(siteIds: string[], days?: number): Promise<Map<string, DayPoint[]>>;
export async function purgeOldVisitors(now?: Date): Promise<number>;   // raderar traffic_visitors äldre än 2 dagar
```

Normalisering (`NormalizedEvent`, exporterad): `{ path, source, country, device, visitorHash }`.
Rena hjälpfunktioner (`normalizePath`, `classifySource`, `classifyDevice`,
`isBot`, `visitorHash`) ligger i `lib/traffic-normalize.ts` utan db-import, så
de kan testas med `tsx scripts/traffic-test.ts` (del A skriver testet; `npm run test:traffic`).

## 5. `packages/sitecms-next` 0.6.0 (del A)

Ny export `sitecms-next/analytics` (serverfil `src/analytics.tsx`, klient
`src/analytics-client.tsx` med `"use client"`, mönster som preview):

```ts
// app/api/sitecms/events/route.ts   (init skapar den)
export { POST } from "sitecms-next/analytics";

// app/layout.tsx, sist i <body>
import { SitecmsAnalytics } from "sitecms-next/analytics";
<SitecmsAnalytics />
```

- `POST`: läser body `{ p, r, q }` (max 2 kB), tar `ip` från `x-forwarded-for` (första) eller `x-real-ip`, `ua` från `user-agent`, `c` från `x-vercel-ip-country` eller `cf-ipcountry`, skickar `{ events: [{…}] }` till `${apiBase}/events` med `x-api-key` = `CMS_API_KEY` (samma env-upplösning som `createSitecms`). Svarar alltid 204 till webbläsaren, även om sitecms svarar fel (loggar `console.warn` en gång per process). Utan `CMS_API_KEY` → 204 och ingen vidarebefordran.
- `<SitecmsAnalytics endpoint?="/api/sitecms/events" />`: async server component; `await isPreview()` → null. Annars renderar `<SitecmsAnalyticsClient endpoint />`.
- Klienten: `usePathname()` + `useEffect`; skickar vid mount och vid varje byte av pathname (inte vid hash/query). `navigator.sendBeacon` om det finns, annars `fetch(…, { keepalive: true })`. Skippar `localhost`/`127.0.0.1`, `navigator.webdriver`, och dubbletter av samma pathname i rad. `r` = `document.referrer`, `q` = `location.search` utan `?` (bara om den innehåller `utm_`).
- `exports` i package.json: `./analytics` (+ `./analytics-client`), `sideEffects: false` oförändrat.
- CLI `init`: lägger `api/sitecms/events` i `routes`-listan (steg 10) med kommentar; skrivs aldrig över. Versionskravet för routen: paketet ≥ 0.6 (samma logik som preview-routen ≥ 0.4).
- Test: `test/analytics.test.mjs` (route-handlern med stubbad fetch; klienten exporterar en ren `shouldTrack(pathname, prev, hostname, webdriver)` som testas). `npm test` i paketet ska vara grönt.
- `CHANGELOG.md` + README-avsnitt "Trafik" (del D skriver texten, A lägger stubben).

## 6. SEO-poäng (`lib/seo-score/`, del B)

```ts
// lib/seo-score/types.ts
export type FindingSeverity = "high" | "medium" | "low";
export type Finding = {
  id: string;                 // stabil nyckel, t.ex. "seo.description.missing"
  severity: FindingSeverity;
  title: string;              // svensk rubrik, t.ex. "3 sidor saknar SEO-beskrivning"
  detail?: string;            // en mening om varför det spelar roll
  href?: string;              // relativ till `/admin/sites/{siteId}`, t.ex. "/seo" eller "/pages/{pageId}"
  count?: number;
  points: number;             // hur många poäng (0–100-skalan) fyndet drar
};
export type ContentResult = { score: number; findings: Finding[]; checkedAt: string };
export type LighthouseResult = {
  performance: number; seo: number; accessibility: number; bestPractices: number;   // 0–100
  lcpMs: number | null; cls: number | null; inpMs: number | null;
  strategy: "mobile"; fetchedAt: string; url: string;
};
export type SeoScore = {
  day: string; score: number; contentScore: number; lighthouseScore: number | null; techScore: number | null;
  findings: Finding[]; lighthouse: LighthouseResult | null; createdAt: Date;
};
```

```ts
// lib/seo-score/content.ts  — ren funktion på CMS-data, ingen nätverk
export function scoreContent(input: ContentInput): ContentResult;
// lib/seo-score/content-load.ts — hämtar ContentInput från db för en sajt
export async function loadContentInput(siteId: string): Promise<ContentInput>;
// lib/seo-score/pagespeed.ts
export async function fetchPageSpeed(url: string, opts?: { apiKey?: string; signal?: AbortSignal }): Promise<LighthouseResult | null>;
// lib/seo-score/index.ts
export function combineScore(content: number, lighthouse: number | null, tech: number | null): number;
export async function runSeoScore(siteId: string, opts?: { skipPageSpeed?: boolean }): Promise<SeoScore>;   // räknar + upsert dagens rad
export async function getLatestSeoScore(siteId: string): Promise<SeoScore | null>;
export async function getSeoScoreSeries(siteId: string, days: number): Promise<{ day: string; score: number }[]>;
export async function getLatestScoresForSites(siteIds: string[]): Promise<Map<string, number>>;
```

Regler nivå 1 (innehåll). Start 100, dra poäng, golv 0. Varje regel ger ett
`Finding` bara när den slår; `title` i svenska med antal; `href` till rätt vy.

| id | Villkor | Poäng | href |
|---|---|---|---|
| `seo.title.missing` | sidor i `seo_meta` utan titel | 6/sida, max 18 | `/seo` (en sida → `/seo/{id}`) |
| `seo.title.length` | titel < 30 eller > 60 tecken | 2/sida, max 8 | `/seo/{id}` |
| `seo.description.missing` | utan beskrivning | 6/sida, max 18 | `/seo` |
| `seo.description.length` | < 70 eller > 155 | 2/sida, max 8 | `/seo/{id}` |
| `seo.title.duplicate` | samma titel på flera sidor | 4/dubblett, max 8 | `/seo` |
| `seo.pages.uncovered` | `pages` utan rad i `seo_meta` (match på slug) | 4/sida, max 12 | `/seo` |
| `seo.ogimage.missing` | startsidan (`page_slug` `""`/`/`/`home`/`start`) saknar og-bild | 4 | `/seo/{id}` |
| `images.alt.missing` | bildblock med värde utan alt (samma query som översikten) | 2/bild, max 12 | `/pages/{pageId}` om en sida, annars `/pages` |
| `posts.cover.alt.missing` | publicerade inlägg med omslagsbild utan alt | 1/inlägg, max 4 | `/posts/{id}` |
| `content.thin` | sida med < 300 ord i sina text/richtext-block | 3/sida, max 9 | `/pages/{pageId}` |
| `posts.stale` | inga publicerade inlägg senaste 90 dagarna (bara om sajten har ≥ 1 inlägg någonsin) | 5 | `/posts/new` |
| `posts.none` | inga inlägg alls | 3 | `/posts/new` |

Viktning: `combineScore` = `round(content*0.6 + lighthouse*0.4)` när lighthouse
finns, annars `content`. `tech` reserverad (null) — räknas inte in nu.
Lighthouse-delpoäng = `round(seo*0.5 + performance*0.3 + accessibility*0.2)`.

PageSpeed: `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=…&strategy=mobile&category=PERFORMANCE&category=SEO&category=ACCESSIBILITY&category=BEST_PRACTICES` (+ `&key=` om `PAGESPEED_API_KEY` finns). Timeout 60 s. URL = `siteUrl(site.domain)`; sajter utan domän → `lighthouse: null`. Fel → null, loggas, poängen räknas på innehållet.

`runSeoScore` upsertar dagens rad (`ON CONFLICT (site_id, day) DO UPDATE`).
Server action `runSeoScoreNow(siteId)` i `lib/actions/seo.ts` (owner eller
admin; max 1 körning per 10 min per sajt — kolla `created_at`/`updated_at` på
dagens rad, annars returnera befintlig). Audit-logg `seo.score.run`.

## 7. Cron (del B)

`vercel.json`: `"crons": [{ "path": "/api/cron/daily", "schedule": "15 3 * * *" }]`.
`app/api/cron/daily/route.ts`: `GET`, kräver `Authorization: Bearer ${CRON_SECRET}`
(Vercel skickar den automatiskt; saknas env → 503). `export const maxDuration = 300`.
Kör, i ordning, och svarar med JSON-sammanfattning:
1. `purgeOldVisitors()`
2. `runSeoScore` för alla sajter: PSI parallellt med `Promise.allSettled` i grupper om 5; sajter utan domän får content-only.
3. Loggar antal och fel; ett fel stoppar aldrig resten.

## 8. Panelen (del C)

Route-segmentet `seo` behålls (länkar finns). Nav-label → **"SEO & Trafik"**,
`PageHeader` title "SEO & Trafik".

Ordning på `/admin/sites/[siteId]/seo`:
1. **Poängkort**: stor siffra 0–100 med färgton (≥ 80 grön, 50–79 amber, < 50 röd), delpoäng "Innehåll" och "Google (Lighthouse)" (– om null), "Beräknad {relativeTime}", knapp "Räkna om" (`runSeoScoreNow`, `SubmitButton` med pendingText "Räknar…", bara owner/admin). Ingen rad ännu → räkna innehållspoängen direkt vid render (`scoreContent(await loadContentInput())`) så kortet aldrig är tomt, med texten "Google-mätning körs varje natt".
2. **Att fixa**: findings sorterade på `points` fallande, max 5, `Åtgärda`-knapp till `href`. Tomt → grönt "Allt ser bra ut".
3. **Trafik**: period-väljare 7/30 dagar (`?period=30`, `Tabs`-komponenten om den passar, annars två länkar). KPI-rutor: Besökare, Sidvisningar, var och en med förändring mot föregående period (`+12 %`/`−3 %`, grå "–" när föregående = 0). Stapeldiagram per dag (inline SVG, ingen lib; `components/admin/TrafficChart.tsx`, tillgänglig med `<title>`/sr-only tabell). Fyra kolumner: Sidor, Källor, Länder (flagga via regional indicator + namn via `Intl.DisplayNames("sv")`), Enheter — topp 8 med andel som tunn stapel. `hasData === false` → `EmptyState` "Ingen trafik ännu" med två rader kod (route + komponent) och länk till `/docs#trafik`.
4. Befintlig SEO-lista och "Lägg till SEO för fler sidor" oförändrade under.

Översikten `/admin/sites/[siteId]`: två nya stat-rutor i raden (grid blir 3 kolumner på lg): "Besökare 7 dagar" (siffra + `Sparkline`, `components/admin/Sparkline.tsx`, inline SVG) och "SEO-poäng" (siffra, ton). Länkar till `/seo`. Högsta finding (om `points ≥ 4`) läggs först i "Förslag".

"Dina sajter" `/admin?list=1`: per kort en rad "{n} besökare · 7 dagar" med mini-sparkline och en poäng-badge. En query för alla sajter (`getVisitorSeriesForSites`, `getLatestScoresForSites`).

Snabbval-texten "SEO-inställningar" → "SEO & Trafik", beskrivning "Poäng, besökare och hur sidorna visas i Google."

## 9. Dokumentation (del D)

- `app/docs/page.tsx`: nytt avsnitt `id="trafik"` efter förhandsgranskning (vad som mäts, inga cookies, två kodrader, draft mode av), nytt `id="api-events"` under API, `id="seo-poang"` kort om poängen. Sidonavigationen i `app/docs/layout.tsx` uppdateras.
- `app/llms.txt/route.ts` (eller motsvarande): samma i kortform.
- `packages/sitecms-next/README.md`: avsnitt "Trafik".
- `lib/integration-snippets.ts` + integrationssidan: events-routen listas bland routes init skapar.
- `CHANGELOG.md` (repo-rot) + `packages/sitecms-next/CHANGELOG.md` 0.6.0.
- `STATUS.json`/`BACKLOG.md`: kort notering.

## 10. Miljövariabler

| Namn | Var | Krävs | Beskrivning |
|---|---|---|---|
| `ANALYTICS_SALT` | sitecms | nej | salt i besökar-hashen; fallback `AUTH_SECRET` |
| `PAGESPEED_API_KEY` | sitecms | nej | höjer PSI-kvoten; utan nyckel funkar det med låg kvot |
| `CRON_SECRET` | sitecms | ja i prod | Vercel sätter den; routen svarar 503 utan |

## 11. Verifiering (arkitekten, efter alla delar)

- `npm run typecheck`, `npm run build:local`, alla `npm run test:*`, `npm test` i paketet.
- `tsx scripts/traffic-test.ts` och `tsx scripts/seo-score-test.ts` (rena funktioner, ingen db).
- Migration 0009 körs mot Neon vid deploy (`npm run build`).
