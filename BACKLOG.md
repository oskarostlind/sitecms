# Backlog

Prioriterad uppifrån och ner. Runnern tar den översta obockade punkten varje körning.

Skriv gärna in egna punkter här mellan körningarna — det är det enklaste sättet att styra bygget utan att starta en session.

## Att göra

- [ ] Skriv alt-texter för de tre bilder som ligger i CMS:et (jjbygg hero, timringskurs hero + porträtt) — fälten finns nu i panelen men är tomma. Kräver att någon beskriver bilderna.
- [ ] timringskurs-sajten läser fortfarande `value` för richtext-block (kör Sanity idag, se beslutspunkten nedan). Samma byte som gjordes i Jjbygg behövs den dagen sajten kopplas till sitecms.
- [ ] Vercel-projektet jjbygg saknar CMS_API_URL/CMS_API_KEY i Preview-miljön — preview-deployer visar därför statiskt reservinnehåll i stället för CMS-innehåll, vilket gör dem oanvändbara för att granska CMS-ändringar. Lägg till variablerna under Settings → Environment Variables → Preview (kräver Oskar).
- [ ] Egen domän för panelen (t.ex. cms.jjbyggboden.se) — läggs till i Vercel-projektet sitecms under Domains, uppdatera ev. AUTH-redirects (kräver Oskar)
- [ ] Google OAuth: env-variabler GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET behöver skapas i Google Cloud Console (redirect-URI: https://sitecms-oskar-ostlinds-projects.vercel.app/api/auth/callback/google) — koden är på plats, knappen aktiveras automatiskt (kräver Oskar)
- [ ] Beslut (Oskar): koppla timringskurs-sajten till sitecms content-API — repot kör idag en egen Sanity Studio, så bytet är ett aktivt val, inte bara en integration
- [ ] Skapa kundkonto för Ola Andersson (info@timringskurs.nu) via panelens användarhantering när sajtkopplingen är beslutad

## Klart

- [x] Jjbygg renderar kundens formatering och alt-texter: sajten läser `html` per richtext-block och `bodyHtml` per inlägg (med `value` som fallback), FAQ-svar och hero-underrubrik visar fet/kursiv/listor/länkar, bilder använder `alt` från API:t, och JSON-LD håller ren text. Verifierat skarpt 2026-08-16: fetmarkering i panelen syntes på jjbyggboden.se efter 2 s och var borta 1 s efter Ångra; innehållet återställt byte-identiskt.
- [x] WYSIWYG-editor för brödtext och richtext-block (tiptap), markdown behålls som lagringsformat via lib/markdown.ts — kunden ser aldrig markdown-syntax
- [x] Omslagsbild på inlägg: uppladdare med förhandsvisning och dra-och-släpp i stället för URL-fält
- [x] Alt-text på bilder (block + omslagsbild), med förklarande hjälptext och varning när beskrivning saknas; exponerad i content-API:t
- [x] Ångra senaste ändringen: ögonblicksbild i aktivitetsloggen för blockredigering, inläggsändring och inläggsborttagning — ångras i sparraden eller från aktivitetsloggen
- [x] Förhandsgranskning av inlägg innan sparning
- [x] Browser-E2E i prod av admin-funktionerna (run 7: 10/10 PASS med tillfälligt syntetiskt admin-konto, raderat efteråt — sajt skapad via panelen, användare skapad+borttagen, media upp/ner via UI, aktivitetslogg, 375px, samt skarp blockredigering på JJ Bygg synlig på jjbyggboden.se efter 2 s och återställd)
- [x] Browser-E2E i prod av kund-redigeringsflödet (run 6: headless Chromium mot prod med syntetiskt kundkonto e2e-test, session via auth-API — 8/8 PASS: login, tenant-isolering, blockredigering sparad+persistent, inlägg skapat+publicerat och verifierat i publika API:t, tjänstepris, SEO-titel, lösenordsbyte med gammalt-nekas/nytt-funkar, 375px utan horisontell overflow)

<!-- runnern flyttar hit avbockade punkter -->
- [x] Site 2: timringskurs upplagd som sajt (run 5: sajt "Norrhed Skog", 3 sidor/17 block, 6 kurser som tjänster, SEO per sida, API-nyckel; innehåll seedat från oskarostlind/timringskurs, verifierat via content-API i prod)
- [x] Säkerhetsfix: content-API:t CDN-cachade auktoriserade svar publikt (s-maxage utan Vary på x-api-key) → svar utan/med fel nyckel fick fullt innehåll i upp till 60 s. Nu private/no-store (run 5)
- [x] Verifiera bilduppladdning mot Vercel Blob live (run 4: inloggning som testkund via auth-API mot prod, POST /api/upload → blob-URL 200 publikt läsbar, media-rad i DB, cross-tenant-upload nekad 403)
- [x] UI-polish + responsivitetsgenomgång 375-1440 px av alla nya vyer (media, användare, inställningar, aktivitet) — kodgranskning run 4: alla tabeller overflow-x-auto + min-w, responsiv mediagrid, mobilmeny, truncate/break-all; render-smoke i prod 200 på samtliga vyer
- [x] Responsivitet 375–1440 px i panelen + polish (täckt av pass i run 3 + 4)
- [x] Bilduppladdning via Vercel Blob (ersätt bild i block, mediabibliotek per sajt)
- [x] Beslut: nyhetssektion på jjbyggboden.se som renderar publicerade inlägg (byggd + e2e-verifierad i run 3)
- [x] Databas: verifiera DATABASE_URL (Neon via Vercel), sätt upp Drizzle + migrationsflöde
- [x] Datamodell: sites, users, memberships, pages, blocks, posts, services, media, api_keys — allt innehåll med site_id
- [x] Auth: Auth.js v5 credentials, roller admin/customer, skyddade routes, inloggningssida
- [x] Admin-layout: sidebar + sajtväljare (admin ser alla sajter, kund låst till sin)
- [x] Sidredigering: lista sidor, redigera textblock och bildblock, spara + publicera
- [x] Inlägg: CRUD + publicera/avpublicera + listvy
- [x] Tjänster & priser: CRUD
- [x] SEO-metadata per sida: title, description, og-bild
- [x] Innehålls-API: GET per sajt med API-nyckel (pages/blocks, posts, services, seo) + on-demand revalidation-webhook mot kundsajt
- [x] Seed: lägg upp JJ Bygg som site, importera innehåll från oskarostlind/Jjbygg (hero, 6 tjänstekort, FAQ, varför-oss, kontakt/footer, SEO)
- [x] Konton: Oskar (admin) + Jesper (customer, jesper@jjbyggboden.se) med tillfälliga lösenord — lägg lösenorden som blocker i STATUS.json så Oskar kan leverera dem
- [x] Jjbygg-integration: branch `cms-integration` i oskarostlind/Jjbygg hämtar allt innehåll från API:t, preview-deploy på Vercel, revalidation < 60 s. RÖR INTE main.
- [x] Scaffold: Next.js 15 + TypeScript + Tailwind, tom adminpanel med login-skal, deployad grön på Vercel
