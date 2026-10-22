# Ändringar i sitecms-next

## 0.5.0

Offertförfrågningar: sajtens formulär skickas till sitecms (panelen under
Förfrågningar + mejl), med bilagor. Allt är additivt — sajter som inte använder
funktionerna fungerar exakt som med 0.4.

- `submitQuoteRequest(input, options?)` — `POST …/quote-requests` med
  `x-api-key` och `cache: "no-store"` → `{ id, emailStatus }`. Finns som
  standardexport (läser env) och på klienten från `createSitecms()`. Bara på
  serversidan: i webbläsaren kastas ett tydligt fel så att nyckeln aldrig läcker.
- `uploadQuoteAttachment(file, name, options?)` — laddar upp en bilaga
  (jpg/png/webp/heic/pdf, max 10 MB) → `{ url, name, contentType, size }`, som
  skickas i `attachments` på förfrågan.
- `hashIp(ip, salt)` — SHA-256 hex av `salt:ip` via Web Crypto, så att alla
  sajter skapar `ipHash` på samma sätt.
- `SitecmsError` har nu `fields: Record<string, string>` — fältfel på svenska
  vid HTTP 400. Vid 429 (och 413) är `message` serverns svenska meddelande,
  redo att visas för kunden. Nätverksfel → `SitecmsError` med `status: 0`.
- Nya typer: `QuoteRequestInput` (alla fält, nya som valfria: `customerType`,
  `budget`, `rot`, `postalCode`, `source`, `attachments`, `extra`),
  `QuoteRequestResult`, `QuoteAttachment`, `QuoteCustomerType`,
  `QuoteRequestOptions`, `QuoteAttachmentOptions`.
- README: avsnittet "Offertförfrågningar" med en komplett server action
  (honeypot, tidsfälla, bilagor, fältfel).
- Fortfarande noll runtime-beroenden.

## 0.4.0

Live-förhandsgranskning: sajten visas i en iframe i panelen och uppdateras
medan kunden skriver, innan något sparas. Allt är additivt — sajter som inte
lägger till routen och komponenten fungerar exakt som med 0.3.

- Ny subpath `sitecms-next/preview`: `GET` (route för
  `app/api/sitecms/preview/route.ts`), `createPreviewRoute(options?)`,
  `<SitecmsPreview />` (async serverkomponent för layouten),
  `previewFrameHeaders(panelOrigins?)` (CSP `frame-ancestors` för `next.config`),
  `isPreview()` och `safePreviewPath()`.
- Ny subpath `sitecms-next/preview-client` (`"use client"`): klientkomponenten
  som `<SitecmsPreview />` renderar — hover-ramar, klicka-för-att-redigera och
  postMessage-protokollet (v1) mot panelen.
- `editable(page, key)` i `sitecms-next` → `{ "data-sitecms": "page:key" }`.
- `getContent()` / `client.getContent()` är preview-medvetna: i draft mode med
  cookien `sitecms_preview` hämtas innehåll med osparade ändringar
  (`x-sitecms-preview`, `cache: "no-store"`). Vid 401/fel används vanligt
  innehåll. `next/headers` läses bara i serverkomponenter och route handlers,
  och `cookies()` bara när draft mode är på — statiska sidor förblir statiska.
  Ny option `createSitecms({ previewToken })`.
- `Content` har det valfria fältet `preview: true` när innehållet kommer från
  en förhandsgranskning.
- `sitecms-next init` skapar även `app/api/sitecms/preview/route.ts` (om den
  saknas) och skriver ut stegen för layouten, `editable()` och frame-headers.
  Projekt med sitecms-next 0.3 eller äldre uppgraderas till ^0.4.
- `react >=18` som valfri peer dependency. Fortfarande inga runtime-beroenden.

## 0.3.0

- Nyckelbaserade routes (`/api/v1/site/…`): `CMS_API_KEY` räcker, `CMS_SITE`
  och `CMS_API_URL` är valfria.
- Signerade webhooks (`x-sitecms-signature`), `verifyWebhook` och
  `verifyWebhookDetailed`.
- `npx sitecms-next init`, `check` och sajtens adress vid `sync`.
