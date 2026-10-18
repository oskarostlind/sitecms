# @sitecms/next

Typad klient för att hämta innehåll från sitecms i en Next.js-sajt (App Router).
Inga beroenden. All hämtning taggas med `sitecms` så att innehållet kan
uppdateras direkt när kunden sparar i panelen.

> Paketet är inte publicerat på npm ännu. Tills vidare: kopiera koden från
> integrationssidan i panelen (`lib/sitecms.ts`) — den är identisk.

## Miljövariabler

```env
CMS_API_URL=https://sitecms-zeta.vercel.app
CMS_SITE=din-sajt
CMS_API_KEY=...
CMS_REVALIDATE_SECRET=...
```

Värdena finns under **Integration** för sajten i sitecms.

## Användning

```ts
// lib/cms.ts
import { createSitecms } from "@sitecms/next";

export const cms = createSitecms({
  apiUrl: process.env.CMS_API_URL!,
  site: process.env.CMS_SITE!,
  apiKey: process.env.CMS_API_KEY!,
});
```

```tsx
// app/page.tsx
import { cms } from "@/lib/cms";

export default async function Home() {
  const content = await cms.getContent();
  const hero = cms.image(content, "home", "hero.image");

  return (
    <main>
      <h1>{cms.text(content, "home", "hero.title", "Välkommen")}</h1>
      {hero ? <img src={hero.src} alt={hero.alt} /> : null}
      <div dangerouslySetInnerHTML={{ __html: cms.block(content, "home", "intro.body").html }} />
    </main>
  );
}
```

| Funktion | Returnerar |
|---|---|
| `getContent()` | Sidor med block, tjänster och SEO |
| `getPosts()` | Publicerade inlägg (utan brödtext), nyast först |
| `getPost(slug)` | Ett inlägg med `body` (markdown) och `bodyHtml`, eller `null` |
| `health()` | `{ ok, site, pages, lastSchemaSyncAt }` — verifierar nyckeln |
| `block(content, page, key)` | `{ value, html, alt }` — alltid strängar |
| `text(content, page, key, fallback?)` | Blockets text |
| `image(content, page, key)` | `{ src, alt }` eller `null` |
| `seo(content, page)` | SEO-uppgifter för sidan eller `null` |

Fel från API:et kastas som `SitecmsError` med `status` (401 fel nyckel, 404 okänd sajt).

## Revalidering

```ts
// app/api/sitecms/revalidate/route.ts
import { revalidateTag } from "next/cache";
import { verifyRevalidateSecret } from "@sitecms/next";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { secret?: unknown } | null;
  if (!(await verifyRevalidateSecret(body?.secret, process.env.CMS_REVALIDATE_SECRET))) {
    return Response.json({ revalidated: false }, { status: 401 });
  }
  revalidateTag("sitecms");
  return Response.json({ revalidated: true });
}
```

Ange sedan `https://din-domän.se/api/sitecms/revalidate` som revalidate-URL i panelen.

## Schema

`sitecms.config.ts` beskriver vilka sidor och fält sajten har:

```ts
import { defineConfig } from "@sitecms/next";

export default defineConfig({
  version: 1,
  pages: [
    {
      slug: "home",
      title: "Startsida",
      blocks: [{ key: "hero.title", type: "text", label: "Rubrik", default: "Välkommen" }],
    },
  ],
});
```

Synka den med `scripts/sitecms-sync.ts` från integrationssidan (lägg i
`"prebuild"`). Fullständig dokumentation: `/docs` i sitecms.
