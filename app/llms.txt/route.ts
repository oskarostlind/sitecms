import {
  aiPromptSnippet,
  DEFAULT_CMS_URL,
  DEPLOY_HOOK_HOSTS,
  DOCS_URL,
  INIT_COMMAND,
  INIT_STEPS,
  LEGACY_SITE_API_PATH,
  npmConfigSnippet,
  npmPostsSnippet,
  npmRevalidateSnippet,
  npmSeoSnippet,
  npmUsageSnippet,
  REVALIDATE_ROUTE_PATH,
  SITE_API_PATH,
  SNIPPET_FILES,
  webhookBodyExample,
} from "@/lib/integration-snippets";

/**
 * /llms.txt — integrationen beskriven för AI-assistenter (ChatGPT, Cursor,
 * Claude …) enligt llms.txt-konventionen. Statisk text, samma källa
 * (lib/integration-snippets.ts) som panelen och /docs.
 */
export const dynamic = "force-static";

const API = `${DEFAULT_CMS_URL}${SITE_API_PATH}`;

function code(lang: string, body: string): string {
  return "```" + lang + "\n" + body.trim() + "\n```";
}

const TEXT = `# sitecms

> sitecms är ett svenskt headless CMS för små företagssajter byggda i Next.js (eller andra ramverk). Utvecklaren deklarerar vilka texter och bilder som ska gå att redigera, kunden ändrar dem själv i en enkel panel på ${DEFAULT_CMS_URL}, och sajten visar ändringen inom några sekunder utan ny deploy. Integrationen kräver ett kommando (\`${INIT_COMMAND}\`) och en miljövariabel (\`CMS_API_KEY\`).

Viktigast för dig som AI-assistent:

- Använd npm-paketet \`sitecms-next\` (Next.js 14.2+ med App Router). Skriv ingen egen CMS-klient och ingen egen fetch mot sitecms.
- Kör \`${INIT_COMMAND}\` i projektets rot. Utvecklaren har API-nyckeln — be inte om den i chatten och skriv den aldrig i koden.
- Hämta innehållet i serverkomponenter med \`getContent()\` och hjälparna \`text()\`, \`image()\`, \`block()\`, \`seo()\`; inlägg med \`getPosts()\`/\`getPost()\`.
- Hårdkoda inte innehåll som ska gå att redigera — deklarera det i \`${SNIPPET_FILES.config}\` med nuvarande text som \`default\`.
- Den enda miljövariabeln är \`CMS_API_KEY\`. Den ska finnas i \`.env.local\` och hos webbhotellet.

## Koppla en Next.js-sajt (App Router)

1. Utvecklaren skapar en sajt i panelen och får en API-nyckel (visas en gång).
2. I kundsajtens rotkatalog:

${code("bash", `${INIT_COMMAND} <api-nyckel>`)}

   Utan argument läser kommandot nyckeln från CMS_API_KEY / .env.local, eller frågar efter den. Det går att köra flera gånger — befintliga filer skrivs inte över. Kommandot:
${INIT_STEPS.map((s) => `   - ${s}`).join("\n")}

3. Lägg \`CMS_API_KEY\` (samma värde) i webbhotellets miljövariabler — Vercel, Netlify, Cloudflare, Render eller egen server.
4. Deklarera fälten i \`${SNIPPET_FILES.config}\` och läs dem i serverkomponenter (exempel nedan).
5. Deploya. \`prebuild\` kör \`sitecms-next sync\`, som skapar sidorna och fälten i panelen och fyller i sajtens revalidate-URL (\`https://<domän>${REVALIDATE_ROUTE_PATH}\`) om den saknas. Adressen tas från \`SITE_URL\` eller från webbhotellets egna variabler (Vercel, Netlify, Render).
6. Kontrollera med \`npx sitecms-next check\` och knappen "Testa anslutningen" under Integration i panelen.

### Miljövariabler

- \`CMS_API_KEY\` — krävs. Avgör vilken sajt innehållet hämtas från och verifierar webhooken.
- \`CMS_API_URL\` — valfri, standard \`${DEFAULT_CMS_URL}\`.
- \`CMS_SITE\`, \`CMS_REVALIDATE_SECRET\` — bara för äldre integrationer (sitecms-next 0.2). Behövs inte i nya projekt.

### ${SNIPPET_FILES.revalidate}

\`init\` skapar den här filen. Den verifierar webhookens signatur och tömmer cache-taggen \`sitecms\`:

${code("ts", npmRevalidateSnippet())}

### ${SNIPPET_FILES.config}

${code("ts", npmConfigSnippet())}

Format:

- \`pages[]\`: \`slug\` (unik, \`^[a-z0-9][a-z0-9._-]*$\`), \`title\`, valfri \`description\`, \`blocks[]\`. Max 100 sidor.
- \`blocks[]\`: \`key\` (unik per sida, samma mönster, t.ex. \`hero.title\`), \`type\`, valfria \`label\` (etiketten kunden ser), \`help\` (hjälptext), \`default\` (startvärde), \`defaultAlt\` (alt-text för bilder). Max 200 block per sida.
- \`type\`: \`text\` (standard om det utelämnas; en- eller flerradstext), \`richtext\` (markdown, levereras även som färdig HTML), \`image\` (bild-URL + alt-text).
- Synken skriver aldrig över det kunden har skrivit. Nya fält får \`default\`; tomma fält fylls med \`default\`. Fält som tagits bort ur configen ligger kvar tills \`sitecms-next sync --prune\` körs.

### Läsa innehållet

${code("tsx", npmUsageSnippet())}

- \`getContent()\` → hela sajten: \`{ site, pages, services, seo }\`.
- \`text(content, sida, nyckel, fallback?)\` → sträng.
- \`image(content, sida, nyckel)\` → \`{ src, alt }\` eller \`null\`.
- \`block(content, sida, nyckel)\` → \`{ value, html, alt }\`, alltid strängar. \`html\` är färdig HTML för richtext och escapad text annars.
- \`seo(content, sida)\` → \`{ title, description, ogImage }\` eller \`null\`.
- \`getPosts()\` → publicerade inlägg utan brödtext, nyast först. \`getPost(slug)\` → inlägg med \`body\` (markdown) och \`bodyHtml\`, eller \`null\`.
- \`createSitecms({ apiKey, apiUrl? })\` → egen klient (t.ex. flera sajter i samma projekt).
- \`verifyWebhook({ rawBody, headers })\` → \`Promise<boolean>\`, för egna webhook-mottagare.

${code("tsx", npmSeoSnippet())}

${code("tsx", npmPostsSnippet())}

## Vanliga misstag

- Hämta innehållet i en klientkomponent (\`"use client"\`) eller i webbläsaren: API-nyckeln exponeras. Hämta alltid på servern.
- Egen \`fetch\` mot sitecms utan cache-taggen \`sitecms\` (\`next: { tags: ["sitecms"] }\`): revalidate-routen kan inte tömma cachen, så ändringar syns först efter nästa deploy. Använd sitecms-next.
- Innehåll hårdkodat i komponenterna i stället för deklarerat i \`${SNIPPET_FILES.config}\`: kunden kan inte ändra det.
- Glömt \`CMS_API_KEY\` hos webbhotellet: bygget hoppar över synken med en varning och sidorna kan inte hämta innehåll.
- \`output: "export"\` (helt statisk export) kan inte revalideras på servern — använd en deploy hook som revalidate-URL i stället.
- Revalidate-routen bakom inloggning, lösenordsskydd eller en omdirigering: webhooken får inte 2xx. Ange den slutliga publika adressen.

## REST-API

Bas-URL: \`${API}\`. Autentisering: headern \`x-api-key: <CMS_API_KEY>\` — nyckeln avgör sajten. Använd bara på serversidan. Svaren är JSON med \`Cache-Control: private, no-store\`; cacha på din sida.

- \`GET ${SITE_API_PATH}/content\` → \`{ "site": { "name", "domain" }, "pages": [{ "slug", "title", "description", "blocks": [{ "key", "type", "label", "value", "alt", "html" }] }], "services": [{ "title", "description", "price" }], "seo": [{ "pageSlug", "title", "description", "ogImage" }] }\`
- \`GET ${SITE_API_PATH}/posts\` → \`{ "posts": [{ "slug", "title", "excerpt", "coverImage", "coverImageAlt", "publishedAt" }] }\`
- \`GET ${SITE_API_PATH}/posts/<postSlug>\` → \`{ "post": { …, "body", "bodyHtml" } }\`, 404 om inlägget saknas eller inte är publicerat.
- \`GET ${SITE_API_PATH}/schema\` → nuvarande struktur, med \`hasValue\` per block.
- \`POST ${SITE_API_PATH}/schema\` → synka struktur. Body: \`{ "version": 1, "pages": [...], "prune"?: false, "siteUrl"?: "https://kund.se" }\`. Svar: \`{ "ok": true, "created": { "pages", "blocks" }, "updated": { "pages", "blocks" }, "orphans": [{ "pageSlug", "key" }], "revalidateUrl": string | null }\`. Ogiltigt schema → 400 \`{ "error", "issues": [...] }\`. \`siteUrl\` (publik https-adress) används för att fylla i revalidate-URL:en om den saknas — befintliga värden skrivs aldrig över.
- \`GET ${SITE_API_PATH}/health\` → \`{ "ok": true, "site": { "name", "slug" }, "pages", "lastSchemaSyncAt", "revalidateUrl", "webhook": { "configured", "lastStatus": "ok" | "failed" | null, "lastAt", "lastError" } }\`
- \`POST ${SITE_API_PATH}/quote-requests\` → offertförfrågan från sajtens formulär (server-till-server).
- Fel: \`{ "error": "…" }\` med 400 (ogiltig förfrågan), 401 (nyckel saknas/ogiltig), 404 (hittades inte), 413 (för stor body).
- Äldre slug-routes \`${LEGACY_SITE_API_PATH}/<slug>/…\` finns kvar med identiska svar.

${code("bash", `curl -s -H "x-api-key: $CMS_API_KEY" ${API}/content`)}

## Webhook (sitecms → sajten)

När kunden sparar skickar sitecms \`POST\` till sajtens revalidate-URL (timeout 5 s). Ange den slutliga adressen — en omdirigering med 301/302 gör om anropet till GET och misslyckas:

- Headers: \`content-type: application/json\`, \`user-agent: sitecms-webhook\`, \`x-sitecms-timestamp: <unix-sekunder>\`, \`x-sitecms-signature: v1=<hex>[,v1=<hex>…]\`
- Body: ${"`"}${webhookBodyExample()}${"`"} (plus \`"secret"\` för äldre sajter som har en revalidate-hemlighet)
- \`<hex>\` = HMAC-SHA256 där nyckeln är UTF-8-strängen \`sha256hex(CMS_API_KEY)\` och meddelandet är \`\${timestamp}.\${rawBody}\` (exakt den mottagna bodyn). En \`v1=\`-post per API-nyckel som sajten har; godkänn om någon matchar.
- Avvisa om |nu − timestamp| > 300 sekunder. Jämför i konstant tid. Svara 2xx när signaturen stämmer, annars 401.

sitecms-next gör allt detta i \`sitecms-next/revalidate\` och \`verifyWebhook()\`. Panelen visar senaste anropets status (ok/failed, tid, fel).

## Andra ramverk och helt statiska sajter: deploy hooks

Webbhotellens deploy hooks / build hooks tar emot vilken POST som helst. Klistra in hookens URL som revalidate-URL under Integration i panelen, så byggs sajten om automatiskt varje gång kunden sparar (tar någon minut). Fungerar med alla ramverk (Astro, SvelteKit, Nuxt, Eleventy, Hugo …) som hämtar innehållet från REST-API:t vid build. Exempel: ${DEPLOY_HOOK_HOSTS.map((h) => `${h.name} (${h.term})`).join(", ")}.

## Prompt att ge en AI-assistent

${aiPromptSnippet()}

## Länkar

- [Utvecklardokumentation](${DOCS_URL}): snabbstart, sitecms-next, CLI, schema-format, API-referens, webhook och uppgradering från 0.2
- [Kom igång](${DOCS_URL}#kom-igang)
- [API-referens](${DOCS_URL}#api)
- [Webhook-signaturen](${DOCS_URL}#api-webhook)
- [Deploy hooks](${DOCS_URL}#deploy-hooks)
- [Uppgradera från sitecms-next 0.2](${DOCS_URL}#uppgradera)
- [npm: sitecms-next](https://www.npmjs.com/package/sitecms-next)
`;

export function GET(): Response {
  return new Response(TEXT, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
