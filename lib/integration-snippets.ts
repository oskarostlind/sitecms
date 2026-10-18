/**
 * Kodsnuttar som utvecklaren klistrar in i kundsajten (Next.js 15 App Router,
 * TypeScript, inga beroenden). Används av integrationssidan i panelen
 * (interpolerade med sajtens riktiga slug och CMS-URL) och av /docs (med
 * platshållare). Snuttarna är vanliga strängar — inget här körs i sitecms.
 *
 * OBS: `${...}` och backticks som ska hamna i den genererade koden är
 * escapade (`\${`, `` \` ``). Kör scripts-kontrollen i rapporten om du ändrar.
 */

export type SnippetContext = {
  /** Bas-URL till sitecms, utan avslutande snedstreck. */
  apiUrl: string;
  /** Sajtens slug i sitecms. */
  site: string;
  /** Kundsajtens domän (utan https://) om den är känd — används i exempel. */
  domain?: string | null;
};

export const DEFAULT_CMS_URL = "https://sitecms-zeta.vercel.app";
export const PLACEHOLDER_SITE = "din-sajt";

/** Var revalidate-routen hamnar på kundsajten med snutten nedan. */
export const REVALIDATE_ROUTE_PATH = "/api/sitecms/revalidate";

export const SNIPPET_FILES = {
  client: "lib/sitecms.ts",
  revalidate: "app/api/sitecms/revalidate/route.ts",
  config: "sitecms.config.ts",
  sync: "scripts/sitecms-sync.ts",
  env: ".env.local",
  packageJson: "package.json",
} as const;

function trimUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function exampleOrigin(domain?: string | null): string {
  const cleaned = domain?.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return `https://${cleaned || "exempel.se"}`;
}

// ---------------------------------------------------------------------------
// .env.local
// ---------------------------------------------------------------------------

export type EnvSnippetValues = SnippetContext & {
  /** Klartextnyckel — bara precis efter att den skapats. Annars platshållare. */
  apiKey?: string | null;
  /** Klartexthemlighet — bara precis efter att den skapats. Annars platshållare. */
  revalidateSecret?: string | null;
};

export const API_KEY_PLACEHOLDER = "<klistra-in-api-nyckeln>";
export const SECRET_PLACEHOLDER = "<klistra-in-revalidate-hemligheten>";

export function envSnippet({ apiUrl, site, apiKey, revalidateSecret }: EnvSnippetValues): string {
  return [
    `CMS_API_URL=${trimUrl(apiUrl)}`,
    `CMS_SITE=${site}`,
    `CMS_API_KEY=${apiKey || API_KEY_PLACEHOLDER}`,
    `CMS_REVALIDATE_SECRET=${revalidateSecret || SECRET_PLACEHOLDER}`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// lib/sitecms.ts
// ---------------------------------------------------------------------------

export function clientSnippet({ apiUrl, site }: SnippetContext): string {
  return `// lib/sitecms.ts — sitecms-klient för Next.js App Router. Inga beroenden.
// Allt hämtas med cache-taggen "sitecms" och töms av
// app/api/sitecms/revalidate/route.ts när innehåll sparas i panelen.

const API_URL = (process.env.CMS_API_URL ?? "${trimUrl(apiUrl)}").replace(/\\/+$/, "");
const SITE = process.env.CMS_SITE ?? "${site}";

export type BlockType = "text" | "richtext" | "image";

export type Block = {
  key: string;
  type: BlockType;
  /** Text, markdown (richtext) eller bild-URL (image). */
  value: string | null;
  /** Bildbeskrivning för image-block, annars null. */
  alt: string | null;
  /** Färdig HTML för richtext-block, annars null. */
  html: string | null;
  label?: string | null;
};

export type Page = {
  slug: string;
  title: string;
  description?: string | null;
  blocks: Block[];
};

export type Service = {
  title: string;
  description: string | null;
  price: string | null;
};

export type Seo = {
  pageSlug: string;
  title: string | null;
  description: string | null;
  ogImage: string | null;
};

export type Content = {
  site: { name: string; domain: string | null };
  pages: Page[];
  services: Service[];
  seo: Seo[];
};

export type PostSummary = {
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  coverImageAlt: string | null;
  publishedAt: string | null;
};

export type Post = PostSummary & {
  /** Markdown. */
  body: string | null;
  /** body renderad till HTML. */
  bodyHtml: string;
};

export class SitecmsError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "SitecmsError";
  }
}

async function request<T>(path: string): Promise<T | null> {
  const res = await fetch(\`\${API_URL}/api/v1/sites/\${encodeURIComponent(SITE)}\${path}\`, {
    headers: { "x-api-key": process.env.CMS_API_KEY! },
    next: { tags: ["sitecms"] },
  });

  if (res.status === 404 && path.startsWith("/posts/")) return null;

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new SitecmsError(\`sitecms: \${body?.error ?? res.statusText} (HTTP \${res.status}, \${path})\`, res.status);
  }

  return (await res.json()) as T;
}

/** Hela sajtens innehåll: sidor med block, tjänster och SEO. */
export async function getContent(): Promise<Content> {
  return (await request<Content>("/content"))!;
}

/** Publicerade inlägg, nyast först (utan brödtext). */
export async function getPosts(): Promise<PostSummary[]> {
  const data = await request<{ posts: PostSummary[] }>("/posts");
  return data?.posts ?? [];
}

/** Ett publicerat inlägg, eller null om det inte finns. */
export async function getPost(slug: string): Promise<Post | null> {
  const data = await request<{ post: Post }>(\`/posts/\${encodeURIComponent(slug)}\`);
  return data?.post ?? null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Ett block som alltid går att rendera: tomma strängar i stället för null.
 * \`html\` är färdig HTML för richtext och HTML-escapad text för övriga typer.
 */
export function block(content: Content, pageSlug: string, key: string): { value: string; html: string; alt: string } {
  const found = content.pages.find((p) => p.slug === pageSlug)?.blocks.find((b) => b.key === key);
  const value = found?.value ?? "";
  return {
    value,
    html: found?.html ?? escapeHtml(value),
    alt: found?.alt ?? "",
  };
}

/** Textvärdet för ett block, eller \`fallback\` om det är tomt. */
export function text(content: Content, pageSlug: string, key: string, fallback = ""): string {
  return block(content, pageSlug, key).value || fallback;
}

/** Bild-URL + alt-text för ett image-block, eller null om ingen bild är vald. */
export function image(content: Content, pageSlug: string, key: string): { src: string; alt: string } | null {
  const { value, alt } = block(content, pageSlug, key);
  return value ? { src: value, alt } : null;
}

/** SEO-uppgifter för en sida (passar i generateMetadata). */
export function seo(content: Content, pageSlug: string): Seo | null {
  return content.seo.find((s) => s.pageSlug === pageSlug) ?? null;
}
`;
}

// ---------------------------------------------------------------------------
// app/api/sitecms/revalidate/route.ts
// ---------------------------------------------------------------------------

export function revalidateRouteSnippet(): string {
  return `// app/api/sitecms/revalidate/route.ts — sitecms anropar den här när innehåll sparas.
import { createHash, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";

/** Jämför i konstant tid (hashar först så längden inte läcker). */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function POST(request: Request) {
  const expected = process.env.CMS_REVALIDATE_SECRET;
  if (!expected) {
    return Response.json({ revalidated: false, error: "CMS_REVALIDATE_SECRET saknas" }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as { secret?: unknown } | null;
  const secret = typeof body?.secret === "string" ? body.secret : "";

  if (!secret || !safeEqual(secret, expected)) {
    return Response.json({ revalidated: false, error: "Fel hemlighet" }, { status: 401 });
  }

  revalidateTag("sitecms");
  return Response.json({ revalidated: true });
}
`;
}

// ---------------------------------------------------------------------------
// sitecms.config.ts
// ---------------------------------------------------------------------------

export function configSnippet({ domain }: Pick<SnippetContext, "domain"> = {}): string {
  const origin = exampleOrigin(domain);
  return `// sitecms.config.ts — vilka sidor och fält sajten har.
// Synkas till sitecms med scripts/sitecms-sync.ts (körs före varje build).
// Befintligt innehåll skrivs aldrig över; nya fält får sitt default-värde.

export type SitecmsBlock = {
  /** Unik per sida. a–z, 0–9, punkt, bindestreck, understreck. T.ex. "hero.title". */
  key: string;
  type: "text" | "richtext" | "image";
  /** Etiketten kunden ser i panelen. */
  label?: string;
  /** Hjälptext under fältet. */
  help?: string;
  /** Startvärde (text, markdown eller bild-URL). */
  default?: string;
  /** Startvärde för bildens alt-text (bara image). */
  defaultAlt?: string;
};

export type SitecmsPage = {
  slug: string;
  title: string;
  description?: string;
  blocks: SitecmsBlock[];
};

export type SitecmsConfig = {
  version: 1;
  pages: SitecmsPage[];
  /** true tar bort block och tomma sidor som inte längre finns här. */
  prune?: boolean;
};

const config: SitecmsConfig = {
  version: 1,
  pages: [
    {
      slug: "home",
      title: "Startsida",
      description: "Det besökaren ser först.",
      blocks: [
        { key: "hero.title", type: "text", label: "Rubrik", help: "Max 60 tecken", default: "Välkommen" },
        {
          key: "hero.image",
          type: "image",
          label: "Hero-bild",
          default: "${origin}/hero.jpg",
          defaultAlt: "Byggarbetare",
        },
        { key: "intro.body", type: "richtext", label: "Ingress" },
      ],
    },
  ],
  prune: false,
};

export default config;
`;
}

// ---------------------------------------------------------------------------
// scripts/sitecms-sync.ts
// ---------------------------------------------------------------------------

export function syncScriptSnippet(): string {
  return `// scripts/sitecms-sync.ts — skickar sitecms.config.ts till sitecms.
// Kör: npx tsx scripts/sitecms-sync.ts
//  (eller node --experimental-strip-types scripts/sitecms-sync.ts)
// Läser CMS_API_URL, CMS_SITE och CMS_API_KEY från miljön eller .env.local / .env.
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { SitecmsConfig } from "../sitecms.config";

type SyncReport = {
  ok: true;
  created: { pages: number; blocks: number };
  updated: { pages: number; blocks: number };
  orphans: { pageSlug: string; key: string }[];
  pruned?: { pages?: number; blocks?: number };
};

type SyncError = { error?: string; issues?: unknown[] };

function loadEnv(): void {
  for (const file of [".env.local", ".env"]) {
    if (existsSync(file)) {
      try {
        process.loadEnvFile(file);
      } catch {
        // Ogiltig rad i filen — variablerna kan fortfarande komma från miljön.
      }
    }
  }
}

async function loadConfig(): Promise<SitecmsConfig> {
  const file = resolve(process.cwd(), "sitecms.config.ts");
  if (!existsSync(file)) throw new Error(\`hittar inte \${file}\`);
  let mod: unknown = await import(pathToFileURL(file).href);
  // tsx (CommonJS) kan slå in default-exporten en extra gång.
  while (mod && typeof mod === "object" && "default" in mod && !("pages" in mod)) {
    mod = (mod as { default: unknown }).default;
  }
  return mod as SitecmsConfig;
}

function fail(message: string): never {
  console.error(\`✖ sitecms-sync: \${message}\`);
  process.exit(1);
}

async function main(): Promise<void> {
  loadEnv();
  const apiUrl = process.env.CMS_API_URL?.replace(/\\/+$/, "");
  const site = process.env.CMS_SITE;
  const apiKey = process.env.CMS_API_KEY;
  if (!apiUrl || !site || !apiKey) {
    fail("CMS_API_URL, CMS_SITE och CMS_API_KEY måste vara satta (t.ex. i .env.local).");
  }

  const config = await loadConfig();
  const url = \`\${apiUrl}/api/v1/sites/\${encodeURIComponent(site)}/schema\`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify(config),
    signal: AbortSignal.timeout(30_000),
  });
  const data = (await res.json().catch(() => null)) as (SyncReport & SyncError) | null;

  if (!res.ok || !data?.ok) {
    console.error(\`✖ sitecms-sync: HTTP \${res.status} från \${url}\`);
    if (data?.error) console.error(\`  \${data.error}\`);
    for (const issue of data?.issues ?? []) {
      const i = issue as { path?: unknown; message?: unknown };
      const line =
        typeof issue === "string"
          ? issue
          : typeof i?.message === "string"
            ? \`\${typeof i.path === "string" ? \`\${i.path}: \` : ""}\${i.message}\`
            : JSON.stringify(issue);
      console.error(\`  - \${line}\`);
    }
    process.exit(1);
  }

  console.log(\`✔ sitecms-sync: \${config.pages.length} sidor synkade till \${site}\`);
  console.log(\`  skapade: \${data.created.pages} sidor, \${data.created.blocks} block\`);
  console.log(\`  uppdaterade: \${data.updated.pages} sidor, \${data.updated.blocks} block\`);
  if (data.pruned && (data.pruned.pages || data.pruned.blocks)) {
    console.log(\`  borttagna: \${data.pruned.pages ?? 0} sidor, \${data.pruned.blocks ?? 0} block\`);
  }
  if (data.orphans.length > 0) {
    console.log(\`  finns i CMS:et men inte i configen (\${data.orphans.length}):\`);
    for (const o of data.orphans) console.log(\`    - \${o.pageSlug} / \${o.key}\`);
    console.log("  Sätt prune: true i sitecms.config.ts för att ta bort dem.");
  }
}

main().catch((err: unknown) => fail(err instanceof Error ? err.message : String(err)));
`;
}

// ---------------------------------------------------------------------------
// package.json (utdrag)
// ---------------------------------------------------------------------------

export function packageJsonSnippet(): string {
  return `{
  "scripts": {
    "sitecms:sync": "tsx scripts/sitecms-sync.ts",
    "prebuild": "tsx scripts/sitecms-sync.ts"
  }
}`;
}

/** Installation av tsx (dev-beroende i kundsajten — inte i sitecms). */
export const TSX_INSTALL = "npm install --save-dev tsx";

/** Alternativ utan tsx (Node 22.6+). */
export const STRIP_TYPES_COMMAND = "node --experimental-strip-types scripts/sitecms-sync.ts";

// ---------------------------------------------------------------------------
// Användningsexempel och curl
// ---------------------------------------------------------------------------

export function usageSnippet(): string {
  return `// app/page.tsx — exempel
import Image from "next/image";
import { block, getContent, image, text } from "@/lib/sitecms";

export default async function Home() {
  const content = await getContent();
  const hero = image(content, "home", "hero.image");

  return (
    <main>
      <h1>{text(content, "home", "hero.title", "Välkommen")}</h1>
      {hero ? <Image src={hero.src} alt={hero.alt} width={1200} height={630} /> : null}
      <div dangerouslySetInnerHTML={{ __html: block(content, "home", "intro.body").html }} />
    </main>
  );
}`;
}

export function healthCurlSnippet({ apiUrl, site }: SnippetContext): string {
  return `curl -s -H "x-api-key: $CMS_API_KEY" \\
  ${trimUrl(apiUrl)}/api/v1/sites/${site}/health`;
}

export function revalidateCurlSnippet({ domain }: Pick<SnippetContext, "domain"> = {}): string {
  return `curl -s -X POST ${exampleOrigin(domain)}${REVALIDATE_ROUTE_PATH} \\
  -H "Content-Type: application/json" \\
  -d '{"secret":"'"$CMS_REVALIDATE_SECRET"'"}'`;
}

/** Föreslagen revalidate-URL för en kundsajt med snutten ovan. */
export function suggestedRevalidateUrl(domain?: string | null): string {
  return `${exampleOrigin(domain)}${REVALIDATE_ROUTE_PATH}`;
}
