# Changelog

- 2026-08-15: Scaffold Next.js 15 + Tailwind, Vercel-projekt kopplat, produktion grön.
- 2026-08-15: Auth (roller), adminpanel med blockredigerare, posts/services/SEO, publikt content-API, Neon+Blob provisionerade, Jjbygg live på CMS i produktion (verifierad revalidering).
- 2026-08-15: Lösenordsbyte + villkorad Google-login, utökad definition of done till full CMS.
- 2026-08-15: Sajt-/användarhantering, mediabibliotek, aktivitetslogg, uppdaterad nav (våg 3).
- 2026-08-15: Nyhetssektion på jjbyggboden.se (e2e-verifierad), responsivitetspass, cachefixar i revalidate-kedjan.
- 2026-08-15: Blob-uppladdning liveverifierad i prod (testsajt/testkonto, cross-tenant 403), responsivitetsgranskning av nya vyer u.a., render-smoke 200 på alla panelvyer.
- 2026-08-15: Site 2 timringskurs (Norrhed Skog) seedad med sidor/block/tjänster/SEO/API-nyckel, verifierad i prod. Säkerhetsfix: content-API:t serverade CDN-cachade svar utan nyckelkontroll — nu no-store.
- 2026-08-15: Browser-E2E i prod (headless Chromium, syntetiskt kundkonto, session via auth-API — inget lösenord i inloggningsfält): 8/8 PASS — login, tenant-isolering, blockredigering, skapa+publicera inlägg (verifierat i publika API:t), tjänstepris, SEO, lösenordsbyte, 375px utan overflow. Nya scripts: e2e-content-fixtures.ts, e2e-browser.mjs.
- 2026-08-15 (run 7): Admin browser-E2E i prod, 10/10 PASS inkl. live-redigering på jjbyggboden.se (synlig 2 s, återställd). E2E-kriteriet uppfyllt — 13/14 kriterier klara, endast Google OAuth-env återstår (Oskar). Syntetiskt admin-konto + testsajt raderade efter körningen.
- 2026-08-15 (run 8): Verification-only run — prod deploy READY, jjbyggboden.se serving CMS content, login page healthy. Google OAuth env still missing; all remaining work blocked on Oskar.
- 2026-08-16 (run 9): Verification-only run 2 — prod READY, all 3 tenant content APIs healthy (200 w/ key, 401 w/o), jjbyggboden.se serving CMS content, no Google OAuth env yet. No buildable work; recommended pausing the scheduled task until env is added.
- 2026-08-16 (run 10): Verification pass 3 — prod READY, all tenant APIs auth-protected, jjbyggboden.se OK. Restored STATUS.json (committed empty by run 9). Paused the scheduled task pending Google OAuth env from Oskar.
- 2026-08-16 (run 11): Verification pass 4 — prod READY, tenant APIs 401 w/o key, jjbyggboden.se OK, Google provider still absent. Re-paused the scheduled task (run 10 pause had not stuck).
- 2026-08-16: Google OAuth uppsatt (OAuth-klient + Vercel-env + prod redeploy, inloggningsflöde verifierat live). 14/14 kriterier uppfyllda — projektet stängt (done).
- 2026-08-16 (run 13): Final verification pass — deploy READY, login 200, content API 401 w/o key, jjbyggboden.se serving CMS content. Project confirmed done; scheduled task disabled.
- 2026-08-16: Riktig publik startsida (hero, funktioner, "så funkar det", målgrupp, CTA, footer) ersätter platshållaren på "/". Endast app/page.tsx + app/layout.tsx (metadata) ändrade — login/panel/API orörda. Build grönt lokalt (dummy env).
