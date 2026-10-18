# sitecms-next

Koppla en Next.js-sajt (App Router) till [sitecms](https://sitecms-zeta.vercel.app):
typad klient, färdig revalidate-route och CLI för schema-sync. Inga beroenden.

```bash
npm install sitecms-next
```

## 1. Miljövariabler

Värdena finns under **Integration** för sajten i sitecms-panelen.

```env
CMS_API_URL=https://sitecms-zeta.vercel.app
CMS_SITE=din-sajt
CMS_API_KEY=...
CMS_REVALIDATE_SECRET=...
```

Kontrollera dem med `npx sitecms-next check`.

## 2. Revalidate-route

```ts
// app/api/sitecms/revalidate/route.ts
export { POST } from "sitecms-next/revalidate";
```

Ange `https://din-domän.se/api/sitecms/revalidate` som revalidate-URL i panelen.
När kunden sparar töms cachetaggen `sitecms` och sajten visar det nya innehållet.

## 3. Deklarera fälten

```ts
// sitecms.config.ts
import { defineConfig } from "sitecms-next";

export default defineConfig({
  pages: [
    {
      slug: "home",
      title: "Startsida",
      blocks: [
        { key: "hero.title", label: "Rubrik", help: "Max 60 tecken", default: "Välkommen" },
        { key: "hero.image", type: "image", label: "Hero-bild" },
        { key: "intro.body", type: "richtext", label: "Ingress" },
      ],
    },
  ],
});
```

```json
{ "scripts": { "prebuild": "sitecms-next sync" } }
```

`sitecms-next sync` skapar saknade sidor och fält i sitecms. Kundens innehåll
skrivs aldrig över. Ogiltig config stoppar bygget; saknade miljövariabler
hoppas över (använd `--strict` för att faila).

## 4. Använd innehållet

```tsx
import { block, getContent, image, text } from "sitecms-next";

export default async function Home() {
  const content = await getContent();
  const hero = image(content, "home", "hero.image");
  return (
    <main>
      <h1>{text(content, "home", "hero.title", "Välkommen")}</h1>
      {hero ? <img src={hero.src} alt={hero.alt} /> : null}
      <div dangerouslySetInnerHTML={{ __html: block(content, "home", "intro.body").html }} />
    </main>
  );
}
```

Även `getPosts()`, `getPost(slug)`, `seo(content, pageSlug)` och `health()`.
Flera sajter i samma projekt: `createSitecms({ apiUrl, site, apiKey })`.

## CLI

| Kommando | Gör |
|---|---|
| `sitecms-next sync [--prune] [--strict] [--config <fil>]` | Synkar configen till sitecms |
| `sitecms-next check` | Verifierar nycklarna |
| `sitecms-next pull` | Skriver ut strukturen i sitecms som JSON |

Dokumentation: https://sitecms-zeta.vercel.app/docs

MIT
