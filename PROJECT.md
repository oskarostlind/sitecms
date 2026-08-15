# sitecms

> Kontraktet för projektet. Runnern läser den här filen varje körning och bygger det som står här — inget annat. Ändra den när målet ändras.

## Mål

Ett multi-tenant CMS där Oskars kunder loggar in och själva redigerar innehållet på sina Next.js-sajter — texter, bilder, inlägg, tjänster/priser och SEO — medan Oskar som admin ser och hanterar alla sajter.

## Kund / ägare

Eget projekt (Oskar Östlind). Pilotkund: JJ Bygg & Entreprenad AB — Jesper Johansson, jesper@jjbyggboden.se, sajt jjbyggboden.se (repo: oskarostlind/Jjbygg). Sajt 2: timringskurs (repo: oskarostlind/timringskurs), läggs in när piloten fungerar.

## Målgrupp

Icke-tekniska småföretagare (som Jesper). De ska kunna logga in, ändra text och bilder på sina sidor, skapa/publicera inlägg, uppdatera tjänster & priser och sätta SEO-metadata — utan att kunna ha sönder sajten. Oskar (admin) ser alla sajter och alla funktioner.

## Scope

**Ingår:**
- Auth med två roller: admin (ser allt) och kund (ser endast sin sajt)
- Sajthantering (multi-tenant: allt innehåll knutet till site_id)
- Sidredigering via strukturerade block: text och bild per sektion
- Inlägg/nyheter: skapa, redigera, publicera, avpublicera
- Tjänster & priser: CRUD
- SEO-metadata per sida (title, description, og-bild)
- Bilduppladdning (Vercel Blob)
- Innehålls-API per sajt (API-nyckel) + on-demand revalidation mot kundsajten
- Integration i Jjbygg-repot på branch `cms-integration` (preview-deploy). När preview är verifierad felfri får runnern merga till main och verifiera skarpt på jjbyggboden.se (Oskars direktiv 2026-08-15).

**Ingår inte:**
- Betalning/Stripe, Slack/Gmail-integrationer, e-postutskick
- Fri drag & drop-sidbyggare (v1 = strukturerade fält)
- Flerspråkighet, custom-domänhantering, analytics

## Stack

- Framework: Next.js 15, App Router, TypeScript
- Styling: Tailwind
- Hosting: Vercel (projekt kopplat till detta repo)
- Databas: Neon Postgres via Vercel Marketplace (env: DATABASE_URL) + Drizzle ORM
- Auth: Auth.js v5, credentials (e-post + lösenord, bcrypt)
- Media: Vercel Blob

## Design

- Adminpanel: stram och professionell, ljust tema, svensk UI-text
- Referens på innehållsstruktur: https://www.jjbyggboden.se (hero, 6 tjänstekort, FAQ, "varför välja oss", footer/kontakt)

## Innehåll

Seedas från befintliga jjbyggboden.se — runnern hämtar texter/bilder ur repot oskarostlind/Jjbygg (samma token). Ingen platshållartext på pilotsajten.

## Definition of done

Prototypen är klar när alla dessa är sanna:

- [ ] Adminpanelen deployad på Vercel, senaste deploy grön
- [ ] Inloggning med två roller fungerar: admin ser alla sajter, kund ser endast sin
- [ ] Kund kan redigera sidtexter och bilder, skapa/redigera/publicera inlägg, hantera tjänster & priser, och sätta SEO-metadata per sida
- [ ] Bilduppladdning fungerar (Vercel Blob)
- [ ] Innehålls-API:t levererar allt innehåll per sajt via API-nyckel
- [ ] Jjbygg-branchen `cms-integration` hämtar allt sitt innehåll från CMS:et på en Vercel preview-URL, och en ändring i panelen syns där inom 60 sekunder
- [ ] Inga layoutbrott i panelen mellan 375px och 1440px
- [ ] Användare kan byta sitt eget lösenord i panelen
- [ ] "Logga in med Google" fungerar (Auth.js Google-provider; knappen visas när GOOGLE_CLIENT_ID/SECRET finns, kontot matchas på e-post mot befintlig användare — okända e-postadresser nekas)
- [ ] Admin kan skapa/redigera sajter och bjuda in kundanvändare via panelen (ingen manuell DB-hantering)
- [ ] Mediabibliotek per sajt: lista, ladda upp och radera bilder
- [ ] Publicerade inlägg exponeras via API:t och renderas på kundsajt när sajten har nyhetssektion (jjbygg: beslut i backlog)
- [ ] Grundläggande aktivitetslogg: vem ändrade vad och när (audit-tabell + vy för admin)

## Autonomiläge

`autonomt` — välj rimligaste alternativet och anteckna antagandet i STATUS.json. Jjbygg: bygg och testa på branchen `cms-integration` (preview). Merge till main är tillåten först när preview-deployen är verifierad felfri i livetest — och verifiera därefter produktionen direkt.

## Deadline

Ingen hård. Sikta på fungerande pilot inom ~1 vecka.
