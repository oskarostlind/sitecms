# Live-preview — arkitekturkontrakt

Mål: när någon redigerar en sida i panelen visas kundens **riktiga sajt** i en
iframe bredvid fälten och uppdateras medan man skriver — innan något sparas.
Som Sanitys Presentation-verktyg. "Spara" fungerar som idag (går live direkt).

Det här är kontraktet mellan tre delar som byggs parallellt:

- **A — sitecms (panel + API)**: preview-sessioner, API, delad vy.
- **B — `packages/sitecms-next` (0.4.0)**: route, klientkomponent, `editable()`.
- **C — kundsajten** (pilot: `oskarostlind/gellivare-traktor`, branch `utveckling`).

Ändra inte namn, URL:er, headers eller meddelandeformat i det här dokumentet
utan att arkitekten godkänner. Allt nytt är additivt — befintliga sajter
(sitecms-next 0.2.x/0.3.x, egna `lib/cms.ts`) ska fungera exakt som förut.

**Inga utkast.** Det finns ingen draft/publish-modell. Osparade ändringar lever
bara i en kortlivad preview-session och syns enbart i iframen.
**Ingen stega** (inga osynliga tecken i texter). Klicka-för-att-redigera bygger
på data-attribut som sajten sätter med `editable()`.

---

## 1. Flöde

```
Panel (sitecms.se)                         Kundsajt (t.ex. gellivare…vercel.app)
──────────────────                         ─────────────────────────────────────
öppnar sidredigeraren, slår på preview
  → startPreviewSession(siteId)
     ← { token, previewBaseUrl, expiresAt }
iframe src =
  {previewBaseUrl}/api/sitecms/preview?token=…&path=/   ─────►  GET-handlern:
                                                                 verifierar token mot
                                                                 GET {api}/preview
                                                                 → draftMode().enable()
                                                                 → cookies (partitioned)
                                                                 → 307 till path
                                                         ◄────  sidan renderas dynamiskt;
                                                                 getContent() skickar
                                                                 x-sitecms-preview → API
                                                                 slår ihop osparade värden
                                                         ◄────  postMessage "ready"
användaren skriver i ett fält
  → postMessage "patch" (direkt, textfält/bild)   ─────►  byter text/src i DOM direkt
  → (debounce 400 ms) setPreviewOverrides(...)
  → postMessage "refresh"                         ─────►  router.refresh() → ny render
                                                         ◄────  "refreshed"
klick på markerat element i iframen               ◄────  postMessage "focus" {page,key}
  → editorn scrollar till och fokuserar fältet
fokus på ett fält i editorn
  → postMessage "highlight" {page,key}            ─────►  scrollar dit + blinkar ram
Spara (som idag) → block live + revalidate
  → setPreviewOverrides(siteId, token, []) + "refresh"
```

---

## 2. Datamodell (A)

Ny tabell `preview_sessions` (schema.ts + `drizzle-manual/0007_preview_sessions.sql`, idempotent):

| kolumn | typ | |
|---|---|---|
| `id` | uuid pk default random | |
| `site_id` | uuid not null → sites.id on delete cascade | |
| `user_id` | uuid not null → users.id on delete cascade | |
| `token_hash` | text not null, unique index | sha256-hex av rå token. Rå token lagras aldrig. |
| `panel_origin` | text not null | Origin som panelen kördes på när sessionen skapades (t.ex. `https://sitecms.se`, `http://localhost:3000`). Tas från requestens host/proto på serversidan, inte från klienten. |
| `overrides` | jsonb not null default `{"blocks":{}}` | se nedan |
| `expires_at` | timestamptz not null | nu + 2 h; förlängs (glidande, 2 h) vid varje `setPreviewOverrides` |
| `created_at`, `updated_at` | timestamptz | |

`overrides`:
```json
{ "blocks": { "<blockId>": { "value": "text/markdown/bild-URL", "alt": "valfri alt-text eller null" } } }
```
Hela mängden osparade ändringar skickas varje gång (ersätter, slås inte ihop).
v1 täcker sidblock (text, richtext, image). Tjänster/SEO/inlägg: senare.

Ny kolumn `sites.preview_url` (text, null) — valfri bas-URL för förhandsgranskning
(t.ex. en Vercel-branch-URL). Visas i Inställningar som "Adress för förhandsgranskning".
`previewBaseUrl` = `preview_url` → `https://{domain}` → origin för `revalidate_url` → null.

Rå token-format: `scp_` + 32 slumpbytes base64url.

---

## 3. API (A)

Alla svar: `CONTENT_CACHE_HEADERS` (`private, no-store`).

### 3.1 Innehåll med preview
`GET /api/v1/site/content` **och** `GET /api/v1/sites/[slug]/content`

Ny valfri header **`x-sitecms-preview: <token>`** (utöver `x-api-key`).

- Saknas headern → exakt som idag.
- Finns och token är giltig (hash matchar, samma sajt som nyckeln, ej utgången)
  → samma JSON-form som idag, men för block med override ersätts `value`
  (och `alt` om den finns i override), och `html` räknas om med
  `markdownToHtml` för richtext. Lägg till toppnivåfältet `"preview": true`.
- Ogiltig/utgången → **401** `{ "error": "Förhandsgranskningen har gått ut. Öppna den igen i sitecms.", "code": "preview_invalid" }`.

### 3.2 Verifiera token
`GET /api/v1/site/preview` **och** `GET /api/v1/sites/[slug]/preview`
Headers: `x-api-key`, `x-sitecms-preview`.

- 200 `{ "ok": true, "expiresAt": "<ISO>", "panelOrigin": "https://sitecms.se" }`
- 401 `{ "error": "...", "code": "preview_invalid" }` (fel/utgången token eller fel sajt)
- 401 vid fel API-nyckel som övriga routes.

### 3.3 Server actions (`lib/actions/preview.ts`, `"use server"`)
- `startPreviewSession(siteId)` → `{ ok: true, token, previewBaseUrl: string | null, expiresAt } | { ok: false, error }`. `requireSiteAccess`. Rensar utgångna sessioner för sajten.
- `setPreviewOverrides(siteId, token, updates: { blockId: string; value: string; alt?: string | null }[])` → `{ ok: true, expiresAt } | { ok: false, error }`. Kontrollera att sessionen tillhör användaren + sajten och att varje blockId tillhör sajten. Max 200 block, max 200 kB totalt.
- `endPreviewSession(siteId, token)` → raderar.

---

## 4. Kundsajtens yta (B, i paketet `sitecms-next` 0.4.0)

### 4.1 Route
Fil på kundsajten: `app/api/sitecms/preview/route.ts`
```ts
export { GET } from "sitecms-next/preview";
```
`GET ?token=<t>&path=<p>`:
1. `path` måste börja med `/` och inte `//` (annars `/`).
2. Verifiera token: `GET {apiBase}/preview` med `x-api-key` + `x-sitecms-preview` (samma `apiBase()` som klienten: slug-route om `CMS_SITE` är satt). Fel → 401 HTML-sida på svenska ("Förhandsgranskningen kunde inte startas …").
3. `(await draftMode()).enable()`, och skriv sedan om `__prerender_bypass` med
   `{ httpOnly: true, secure: true, sameSite: "none", partitioned: true, path: "/" }`
   (samma trick som next-sanity — krävs för cookies i en iframe från annan domän).
4. Sätt cookie `sitecms_preview` = token och `sitecms_preview_origin` = `panelOrigin` från verify-svaret, båda `{ httpOnly: true, secure: true, sameSite: "none", partitioned: true, path: "/", maxAge: 7200 }`.
   På `http://localhost` (dev): `secure: false, sameSite: "lax"`, inget `partitioned`.
5. 307 till `path`.

`GET ?disable=1&path=/` → `draftMode().disable()`, rensa cookies, 307 till path.

### 4.2 Innehåll
`getContent()` / `client.getContent()` blir preview-medvetna automatiskt:
om `draftMode().isEnabled` **och** cookien `sitecms_preview` finns → hämta med
`x-sitecms-preview` och `cache: "no-store"`. Vid 401/fel → hämta vanligt
innehåll (sajten får aldrig gå sönder). `next/headers` importeras dynamiskt i
try/catch så paketet fungerar utanför Next och vid build. `cookies()` får bara
anropas när draft mode är på — statiska sidor ska förbli statiska.

### 4.3 Markera redigerbara element
```ts
import { editable } from "sitecms-next";
<h1 {...editable("home", "hero.title")}>{text}</h1>
// → data-sitecms="home:hero.title"
```
Attributet renderas alltid (ofarligt i produktion).

### 4.4 Komponent i layouten
```tsx
import { SitecmsPreview } from "sitecms-next/preview";
// i app/layout.tsx, sist i <body>:
<SitecmsPreview />
```
Async serverkomponent: renderar `null` om draft mode inte är på. Annars
klientkomponenten (`sitecms-next/preview-client`, `"use client"`) med
`panelOrigin` från cookien. Klientkomponenten:
- Är bara aktiv i en iframe (`window.parent !== window`). Utanför iframe i
  draft mode: liten fast bar längst ner "Förhandsgranskning · Avsluta" (länk till `?disable=1`).
- Accepterar bara meddelanden där `event.origin === panelOrigin` och `source === "sitecms"`.
- Ritar hover-ram + liten etikett över `[data-sitecms]` när overlays är på
  (default på). Klick på markerat element: `preventDefault` + `stopPropagation`, skicka `focus`.
- Postar alltid med `targetOrigin = panelOrigin`.

### 4.5 Frame-headers
Sajten måste tillåta att panelen bäddar in den. Paketet exporterar
`previewFrameHeaders(panelOrigins?: string[])` → `[{ key: "Content-Security-Policy", value: "frame-ancestors 'self' https://sitecms.se …" }]`
(default: origin för `CMS_API_URL` eller `https://sitecms.se`, plus `https://www.sitecms.se`).
`X-Frame-Options` måste tas bort på sajten (CSP ersätter den).

---

## 5. postMessage-protokoll (v1)

Panel → sajt (`source: "sitecms"`, `v: 1`):
| type | fält | effekt |
|---|---|---|
| `refresh` | — | `router.refresh()` (i `startTransition`), sedan `refreshed` |
| `patch` | `page, key, kind: "text" \| "image", value, alt?` | Direkt DOM-byte på `[data-sitecms="page:key"]`. text: `textContent` (bara om elementet saknar barnelement). image: `src` på `<img>` (eller första `img` inuti), ta bort `srcset`, sätt `alt` om given. |
| `highlight` | `page, key` | scrolla in första matchande element (smooth, block center), blinka ramen |
| `overlays` | `enabled: boolean` | slå på/av hover-ramar + klick |

Sajt → panel (`source: "sitecms-preview"`, `v: 1`):
| type | fält | när |
|---|---|---|
| `ready` | `path, title, fields: {page,key}[]` | vid mount, efter navigering och efter refresh |
| `refreshed` | `path` | när en refresh renderats klart |
| `focus` | `page, key` | klick på markerat element |

`page` och `key` matchar `^[a-z0-9._-]+$`; separator i attributet är `:`.

---

## 6. Panelen (A)

I sidredigeraren (`/admin/sites/[siteId]/pages/[pageId]`):
- Knapp **"Förhandsgranska"** i sidhuvudet. På ≥1024 px: delad vy — fälten
  till vänster (~440–520 px, egen scroll), iframen till höger (fyller höjden).
  Under 1024 px: flikar "Redigera / Förhandsgranska".
- Verktygsrad över iframen: aktuell sökväg, växla Dator/Mobil (390 px bred
  ram, centrerad), "Klicka för att redigera" av/på, ladda om, öppna i ny flik, stäng.
- Status: "Uppdaterad", "Uppdaterar…", och fel. Kommer inget `ready` inom 10 s:
  hjälpkort "Sajten svarar inte på förhandsgranskning" med vad som krävs
  (sitecms-next 0.4+, routen, `<SitecmsPreview />`, frame-headers) + länk till /docs.
  Saknas `previewBaseUrl`: be användaren fylla i adressen under Inställningar.
- Initial sökväg: sidan med slug `home` → `/`, annars `/{slug}`. Användaren kan navigera fritt i iframen.
- Tillståndet (på/av, Dator/Mobil) kommer ihåg per webbläsare (localStorage i try/catch).
- Postar bara till iframens origin; tar bara emot från samma origin.
- Följ `docs/DESIGN.md`. Svensk text, du-tilltal.

Docs: sektion "Live-förhandsgranskning" på `/docs`, i `app/llms.txt` och på
Integration-sidan. Paketets README (B) beskriver samma steg.
