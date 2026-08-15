# Backlog

Prioriterad uppifrån och ner. Runnern tar den översta obockade punkten varje körning.

Skriv gärna in egna punkter här mellan körningarna — det är det enklaste sättet att styra bygget utan att starta en session.

## Att göra

- [ ] Google OAuth: env-variabler GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET behöver skapas i Google Cloud Console (redirect-URI: https://sitecms-oskar-ostlinds-projects.vercel.app/api/auth/callback/google) — flagga som blocker tills Oskar (eller en browser-session) fixat dem; koden ska redan vara på plats
- [ ] Admin: sajthantering (skapa sajt, redigera namn/domän/revalidate-url, generera API-nyckel)
- [ ] Admin: användarhantering (skapa kundanvändare med temp-lösenord, koppla till sajt, ta bort)
- [ ] Mediabibliotek per sajt: grid med uppladdade bilder, ladda upp, radera (Blob + media-tabellen)
- [ ] Aktivitetslogg: audit-tabell (userId, siteId, action, detail, ts) skriven från alla server actions + enkel vy för admin
- [ ] Beslut: nyhetssektion på jjbyggboden.se som renderar publicerade inlägg (fråga = anteckna som assumption, bygg bakom feature-flagga)

- [ ] Lösenordsbyte-funktion (kund ska kunna byta sitt tillfälliga lösenord)
- [ ] Livetesta kund-redigeringsflödet i UI som Jesper (redigera block, spara, se ändring live)
- [ ] Verifiera bilduppladdning mot Vercel Blob live (BLOB_READ_WRITE_TOKEN finns nu)

- [ ] Bilduppladdning via Vercel Blob (ersätt bild i block, mediabibliotek per sajt)
- [ ] Responsivitet 375–1440 px i panelen + polish
- [ ] Site 2: lägg upp timringskurs som sajt när piloten är verifierad

## Klart

<!-- runnern flyttar hit avbockade punkter -->
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
