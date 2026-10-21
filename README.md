# sitecms

Se PROJECT.md for the project contract.

## Koppla en kundsajt

En ny kundsajt (Next.js 14.2+ med App Router) kopplas med ett kommando och en miljövariabel:

```bash
npx sitecms-next init <api-nyckel>
```

`init` verifierar nyckeln, sparar `CMS_API_KEY` i `.env.local`, installerar `sitecms-next`, skapar
`app/api/sitecms/revalidate/route.ts` och `sitecms.config.ts`, lägger till `"prebuild": "sitecms-next sync"` och
synkar fälten. Sedan läggs `CMS_API_KEY` hos webbhotellet (Vercel, Netlify, Cloudflare, Render, egen server) — det
är den enda variabeln. `CMS_API_URL` är valfri (default `https://sitecms.se`).

- Nyckelbaserade API-routes: `/api/v1/site/{content,posts,posts/<slug>,schema,health,quote-requests}` med `x-api-key`.
- Webhooken till sajtens revalidate-URL är signerad (`x-sitecms-signature: v1=…`, HMAC-SHA256 med `sha256hex(apiKey)`
  över `${timestamp}.${rawBody}`). Panelen visar status för senaste anropet.
- Sajter som inte är Next.js: klistra in webbhotellets deploy hook som revalidate-URL.
- För AI-assistenter: `/llms.txt`, och en färdig prompt under Integration i panelen.
- Äldre integrationer (sitecms-next 0.2 / copy-paste med `CMS_API_URL`, `CMS_SITE`, `CMS_API_KEY`,
  `CMS_REVALIDATE_SECRET` och slug-routes `/api/v1/sites/<slug>/…`) fortsätter fungera oförändrade.

Utvecklardokumentation: `/docs` (källa `app/docs/page.tsx`, snuttar i `lib/integration-snippets.ts`).
