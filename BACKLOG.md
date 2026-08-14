# Backlog

Prioriterad uppifrån och ner. Runnern tar den översta obockade punkten varje körning.

Skriv gärna in egna punkter här mellan körningarna — det är det enklaste sättet att styra bygget utan att starta en session.

## Att göra

- [ ] Scaffold: Next.js 15 + TypeScript + Tailwind, tom adminpanel med login-skal, deploya till Vercel så en URL finns
- [ ] Databas: verifiera DATABASE_URL (Neon via Vercel), sätt upp Drizzle + migrationsflöde
- [ ] Datamodell: sites, users, memberships, pages, blocks, posts, services, media, api_keys — allt innehåll med site_id
- [ ] Auth: Auth.js v5 credentials, roller admin/customer, skyddade routes, inloggningssida
- [ ] Admin-layout: sidebar + sajtväljare (admin ser alla sajter, kund låst till sin)
- [ ] Sidredigering: lista sidor, redigera textblock och bildblock, spara + publicera
- [ ] Bilduppladdning via Vercel Blob (ersätt bild i block, mediabibliotek per sajt)
- [ ] Inlägg: CRUD + publicera/avpublicera + listvy
- [ ] Tjänster & priser: CRUD
- [ ] SEO-metadata per sida: title, description, og-bild
- [ ] Innehålls-API: GET per sajt med API-nyckel (pages/blocks, posts, services, seo) + on-demand revalidation-webhook mot kundsajt
- [ ] Seed: lägg upp JJ Bygg som site, importera innehåll från oskarostlind/Jjbygg (hero, 6 tjänstekort, FAQ, varför-oss, kontakt/footer, SEO)
- [ ] Konton: Oskar (admin) + Jesper (customer, jesper@jjbyggboden.se) med tillfälliga lösenord — lägg lösenorden som blocker i STATUS.json så Oskar kan leverera dem
- [ ] Jjbygg-integration: branch `cms-integration` i oskarostlind/Jjbygg hämtar allt innehåll från API:t, preview-deploy på Vercel, revalidation < 60 s. RÖR INTE main.
- [ ] Responsivitet 375–1440 px i panelen + polish
- [ ] Site 2: lägg upp timringskurs som sajt när piloten är verifierad

## Klart

<!-- runnern flyttar hit avbockade punkter -->
