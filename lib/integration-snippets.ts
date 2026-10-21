/**
 * Kodsnuttar och texter som utvecklaren (eller deras AI-assistent) använder
 * för att koppla en kundsajt. Används av integrationssidan i panelen, av
 * sidan "Ny sajt", av /docs och av /llms.txt. Snuttarna är vanliga strängar —
 * inget här körs i sitecms.
 *
 * OBS: `${...}` och backticks som ska hamna i den genererade koden är
 * escapade (`\${`, `` \` ``). Den genererade koden typkontrolleras genom att
 * skriva ut snuttarna till en temp-katalog och köra tsc mot projektets
 * next-typer — gör om det om du ändrar något.
 */

export type SnippetContext = {
  /** Bas-URL till sitecms, utan avslutande snedstreck. */
  apiUrl: string;
  /** Sajtens slug i sitecms (bara för äldre integrationer). */
  site: string;
  /** Kundsajtens domän (utan https://) om den är känd — används i exempel. */
  domain?: string | null;
};

/** sitecms publika adress. Standard i sitecms-next 0.3 och i snuttarna. */
export const DEFAULT_CMS_URL = "https://sitecms.se";
/** Maskinläsbar beskrivning av integrationen för AI-assistenter. */
export const LLMS_TXT_URL = `${DEFAULT_CMS_URL}/llms.txt`;
export const DOCS_URL = `${DEFAULT_CMS_URL}/docs`;
export const PLACEHOLDER_SITE = "din-sajt";

/** Var revalidate-routen hamnar på kundsajten (init och snuttarna nedan). */
export const REVALIDATE_ROUTE_PATH = "/api/sitecms/revalidate";

/** Nyckelbaserade API-routes (sajten avgörs av API-nyckeln). */
export const SITE_API_PATH = "/api/v1/site";
/** Äldre slug-routes — finns kvar och svarar likadant. */
export const LEGACY_SITE_API_PATH = "/api/v1/sites";

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

/** Värdar som är samma sitecms som standardadressen (gamla adressen m.fl.). */
const DEFAULT_CMS_HOSTS = ["sitecms.se", "www.sitecms.se", "sitecms-zeta.vercel.app"];

/** true om adressen är sitecms standardadress (då behövs ingen CMS_API_URL). */
export function isDefaultCmsUrl(url: string): boolean {
  try {
    const parsed = new URL(trimUrl(url));
    return parsed.protocol === "https:" && DEFAULT_CMS_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Adressen som snuttarna ska använda: standardadressen för sitecms egna
 * värdar, annars den här installationens adress (t.ex. lokal utveckling).
 */
export function snippetApiUrl(cmsUrl: string): string {
  return isDefaultCmsUrl(cmsUrl) ? DEFAULT_CMS_URL : trimUrl(cmsUrl);
}

// ---------------------------------------------------------------------------
// Miljövariabler
// ---------------------------------------------------------------------------

export const API_KEY_PLACEHOLDER = "<klistra-in-api-nyckeln>";
export const SECRET_PLACEHOLDER = "<klistra-in-revalidate-hemligheten>";

/** Den enda variabeln en ny integration behöver. */
export function envSnippet({ apiKey }: { apiKey?: string | null } = {}): string {
  return `CMS_API_KEY=${apiKey || API_KEY_PLACEHOLDER}`;
}

export type LegacyEnvSnippetValues = SnippetContext & {
  /** Klartextnyckel — bara precis efter att den skapats. Annars platshållare. */
  apiKey?: string | null;
  /** Klartexthemlighet — bara precis efter att den skapats. Annars platshållare. */
  revalidateSecret?: string | null;
};

/** De fyra variablerna som integrationer före sitecms-next 0.3 använder. */
export function legacyEnvSnippet({ apiUrl, site, apiKey, revalidateSecret }: LegacyEnvSnippetValues): string {
  return [
    `CMS_API_URL=${trimUrl(apiUrl)}`,
    `CMS_SITE=${site}`,
    `CMS_API_KEY=${apiKey || API_KEY_PLACEHOLDER}`,
    `CMS_REVALIDATE_SECRET=${revalidateSecret || SECRET_PLACEHOLDER}`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// npm-vägen (rekommenderad): sitecms-next
// ---------------------------------------------------------------------------

export const NPM_PACKAGE = "sitecms-next";
export const NPM_INSTALL = "npm install sitecms-next";
export const NPM_UPGRADE = "npm install sitecms-next@latest";
export const NPM_CHECK = "npx sitecms-next check";
export const NPM_SYNC = "npx sitecms-next sync";
export const INIT_COMMAND = "npx sitecms-next init";

/** `npx sitecms-next init <nyckel>` — utan nyckel om den inte är känd. */
export function initCommand(apiKey?: string | null): string {
  return apiKey ? `${INIT_COMMAND} ${apiKey}` : INIT_COMMAND;
}

/** Vad `init` gör, i ordning. Samma lista i panelen, /docs och /llms.txt. */
export const INIT_STEPS: readonly string[] = [
  "kontrollerar nyckeln mot sitecms och sparar CMS_API_KEY i .env.local (som läggs i .gitignore)",
  "installerar sitecms-next i projektet",
  `skapar ${SNIPPET_FILES.revalidate}, som tar emot webhooken när kunden sparar`,
  `skapar ${SNIPPET_FILES.config} — från strukturen som redan finns i sitecms, annars ett exempel`,
  'lägger till "prebuild": "sitecms-next sync" i package.json och synkar fälten direkt',
];

/** app/api/sitecms/revalidate/route.ts med paketet: en rad. */
export function npmRevalidateSnippet(): string {
  return `export { POST } from "sitecms-next/revalidate";`;
}

/** sitecms.config.ts med defineConfig från paketet. */
export function npmConfigSnippet({ domain }: Pick<SnippetContext, "domain"> = {}): string {
  const origin = exampleOrigin(domain);
  return `import { defineConfig } from "sitecms-next";

// Vilka sidor och fält kunden ska kunna redigera. Synkas till sitecms med
// "sitecms-next sync" (prebuild). Kundens innehåll skrivs aldrig över;
// nya fält får sitt default-värde.
export default defineConfig({
  pages: [
    {
      slug: "home",
      title: "Startsida",
      description: "Det besökaren ser först.",
      blocks: [
        { key: "hero.title", label: "Rubrik", help: "Max 60 tecken", default: "Välkommen" },
        {
          key: "hero.image",
          type: "image",
          label: "Hero-bild",
          default: "${origin}/hero.jpg",
          defaultAlt: "Byggarbetare på ett tak",
        },
        { key: "intro.body", type: "richtext", label: "Ingress" },
      ],
    },
  ],
});
`;
}

/** package.json-utdrag: synka strukturen före varje build. */
export function npmPackageJsonSnippet(): string {
  return `{
  "scripts": {
    "prebuild": "sitecms-next sync"
  }
}`;
}

/** Användning i en sida med paketet (läser CMS_API_KEY från env). */
export function npmUsageSnippet(): string {
  return `// app/page.tsx — en serverkomponent
import Image from "next/image";
import { block, getContent, image, text } from "sitecms-next";

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

/** SEO med paketet. */
export function npmSeoSnippet(): string {
  return `// app/page.tsx
import type { Metadata } from "next";
import { getContent, seo } from "sitecms-next";

export async function generateMetadata(): Promise<Metadata> {
  const meta = seo(await getContent(), "home");
  return {
    title: meta?.title ?? undefined,
    description: meta?.description ?? undefined,
    openGraph: meta?.ogImage ? { images: [meta.ogImage] } : undefined,
  };
}`;
}

/** Inlägg med paketet. */
export function npmPostsSnippet(): string {
  return `// app/nyheter/[slug]/page.tsx
import { notFound } from "next/navigation";
import { getPost } from "sitecms-next";

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.bodyHtml }} />
    </article>
  );
}`;
}

/** Flera sajter eller egna värden: explicit klient. */
export function npmExplicitClientSnippet(): string {
  return `import { createSitecms } from "sitecms-next";

// Nyckeln avgör vilken sajt innehållet hämtas från.
export const cms = createSitecms({ apiKey: process.env.CMS_API_KEY_ANNAN! });

const content = await cms.getContent();`;
}

/** Egen route-handler som verifierar webhooken med verifyWebhook. */
export function npmVerifyWebhookSnippet(): string {
  return `// app/api/sitecms/revalidate/route.ts — egen variant
import { revalidatePath, revalidateTag } from "next/cache";
import { verifyWebhook } from "sitecms-next";

export async function POST(request: Request) {
  // Läs bodyn exakt en gång — signaturen gäller de exakta bytes som skickades.
  const rawBody = await request.text();
  // Läser CMS_API_KEY (och ev. CMS_REVALIDATE_SECRET) från miljön.
  if (!(await verifyWebhook({ rawBody, headers: request.headers }))) {
    return Response.json({ revalidated: false }, { status: 401 });
  }
  revalidateTag("sitecms");
  revalidatePath("/sitemap.xml");
  return Response.json({ revalidated: true });
}`;
}

// ---------------------------------------------------------------------------
// Prompt till AI-assistenter (ChatGPT, Cursor, Claude …)
// ---------------------------------------------------------------------------

/** Kopierbar instruktion. Innehåller aldrig någon nyckel. */
export function aiPromptSnippet(): string {
  return `Koppla den här Next.js-sajten (App Router) till sitecms så att kunden kan ändra texter och bilder själv. Läs ${LLMS_TXT_URL} först – där finns hela integrationen och API:t.

Regler:
1. Använd npm-paketet sitecms-next. Skriv ingen egen CMS-klient.
2. Kör \`${INIT_COMMAND}\` i projektets rot (eller be mig köra det – jag har API-nyckeln). Det skapar .env.local med CMS_API_KEY, ${SNIPPET_FILES.revalidate}, ${SNIPPET_FILES.config} och ett prebuild-steg som synkar fälten. Skriv aldrig API-nyckeln i koden och be mig inte klistra in den i chatten.
3. Deklarera i ${SNIPPET_FILES.config} alla texter och bilder som kunden ska kunna ändra. Blocktyper: text, richtext, image. Ge varje fält label, help och default med det nuvarande innehållet.
4. Hämta innehållet i serverkomponenter med getContent() och hjälparna text(), image() och block() från "sitecms-next" (getPosts()/getPost() för nyheter, seo() i generateMetadata). Hårdkoda inte innehållet.
5. Hämta aldrig innehållet i klientkomponenter eller i webbläsaren – då exponeras API-nyckeln.
6. Använd inte egen fetch mot sitecms. sitecms-next hämtar med cache-taggen "sitecms", som revalidate-routen tömmer när kunden sparar. Egen fetch utan den taggen gör att ändringar bara syns efter en ny deploy.
7. Den enda miljövariabeln är CMS_API_KEY. Påminn mig om att lägga in den hos webbhotellet också (Vercel, Netlify, Cloudflare, egen server …).`;
}

// ---------------------------------------------------------------------------
// Copy-paste utan npm: lib/sitecms.ts
// ---------------------------------------------------------------------------

export function clientSnippet({ apiUrl = DEFAULT_CMS_URL }: { apiUrl?: string } = {}): string {
  return `// lib/sitecms.ts — sitecms-klient för Next.js App Router. Inga beroenden.
// Kräver bara CMS_API_KEY (sajten avgörs av nyckeln). Allt hämtas med
// cache-taggen "sitecms" och töms av app/api/sitecms/revalidate/route.ts när
// innehåll sparas i panelen. Använd bara i serverkomponenter.

const API_URL = (process.env.CMS_API_URL ?? "${trimUrl(apiUrl)}").replace(/\\/+$/, "");

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
  const apiKey = process.env.CMS_API_KEY;
  if (!apiKey) throw new SitecmsError("sitecms: CMS_API_KEY saknas i miljön.", 500);

  const res = await fetch(\`\${API_URL}/api/v1/site\${path}\`, {
    headers: { "x-api-key": apiKey },
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
// Copy-paste utan npm: app/api/sitecms/revalidate/route.ts
// ---------------------------------------------------------------------------

export function revalidateRouteSnippet(): string {
  return `// app/api/sitecms/revalidate/route.ts — sitecms anropar den här när innehåll sparas.
// Verifierar webhookens v1-signatur med CMS_API_KEY (Web Crypto — fungerar i
// Node och Edge). Äldre integrationer med CMS_REVALIDATE_SECRET godtas också.
import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";

/** Hur gammal en webhook får vara (sekunder). */
const MAX_AGE_SECONDS = 300;
const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message)));
}

/** Jämför i konstant tid (hashar först så att längden inte läcker). */
async function safeEqual(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([sha256Hex(a), sha256Hex(b)]);
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha.charCodeAt(i) ^ hb.charCodeAt(i);
  return diff === 0;
}

/**
 * x-sitecms-signature: v1=<hex>[,v1=<hex>…] där
 * hex = HMAC-SHA256(nyckel = sha256hex(CMS_API_KEY), meddelande = \`\${timestamp}.\${rawBody}\`).
 */
async function hasValidSignature(request: Request, rawBody: string, apiKey: string): Promise<boolean> {
  const timestamp = request.headers.get("x-sitecms-timestamp") ?? "";
  const header = request.headers.get("x-sitecms-signature") ?? "";
  if (!/^\\d+$/.test(timestamp) || !header) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > MAX_AGE_SECONDS) return false;

  const expected = await hmacSha256Hex(await sha256Hex(apiKey), \`\${timestamp}.\${rawBody}\`);
  let valid = false;
  for (const part of header.split(",")) {
    const [version, signature] = part.trim().split("=");
    if (version === "v1" && signature && (await safeEqual(signature.toLowerCase(), expected))) valid = true;
  }
  return valid;
}

/** Äldre form: { "secret": "…" } i bodyn, jämförd med CMS_REVALIDATE_SECRET. */
async function hasValidLegacySecret(rawBody: string, expected: string): Promise<boolean> {
  let body: { secret?: unknown } | null = null;
  try {
    body = JSON.parse(rawBody) as { secret?: unknown } | null;
  } catch {
    return false;
  }
  const secret = typeof body?.secret === "string" ? body.secret : "";
  return secret !== "" && (await safeEqual(secret, expected));
}

export async function POST(request: Request) {
  const apiKey = process.env.CMS_API_KEY;
  const legacySecret = process.env.CMS_REVALIDATE_SECRET;
  if (!apiKey && !legacySecret) {
    return Response.json({ revalidated: false, error: "CMS_API_KEY saknas på kundsajten" }, { status: 500 });
  }

  const rawBody = await request.text();
  const valid =
    (apiKey ? await hasValidSignature(request, rawBody, apiKey) : false) ||
    (legacySecret ? await hasValidLegacySecret(rawBody, legacySecret) : false);

  if (!valid) {
    return Response.json({ revalidated: false, error: "Ogiltig eller för gammal signatur" }, { status: 401 });
  }

  // Next.js 16: { expire: 0 } ger färskt innehåll direkt (formen med bara taggen är utfasad).
  // Next.js 14–15 tar bara taggen och ignorerar det andra argumentet.
  (revalidateTag as (tag: string, profile?: { expire?: number }) => void)("sitecms", { expire: 0 });
  return Response.json({ revalidated: true });
}
`;
}

// ---------------------------------------------------------------------------
// Copy-paste utan npm: sitecms.config.ts
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
// Copy-paste utan npm: scripts/sitecms-sync.ts
// ---------------------------------------------------------------------------

export function syncScriptSnippet({ apiUrl = DEFAULT_CMS_URL }: { apiUrl?: string } = {}): string {
  return `// scripts/sitecms-sync.ts — skickar sitecms.config.ts till sitecms.
// Kör: npx tsx scripts/sitecms-sync.ts [--strict]
//  (eller node --experimental-strip-types scripts/sitecms-sync.ts)
// Läser CMS_API_KEY (och valfritt CMS_API_URL, SITE_URL) från miljön eller .env.local / .env.
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
  revalidateUrl?: string | null;
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

/**
 * Sajtens publika adress, om webbhotellet berättar den. sitecms använder den
 * för att fylla i revalidate-URL:en när den saknas (skriver aldrig över).
 */
function siteUrl(): string | undefined {
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const candidates = [
    process.env.SITE_URL, // eget värde
    process.env.NEXT_PUBLIC_SITE_URL,
    vercelHost ? \`https://\${vercelHost}\` : undefined, // Vercel
    process.env.NETLIFY ? process.env.URL : undefined, // Netlify
    process.env.RENDER_EXTERNAL_URL, // Render
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      if (url.protocol === "https:") return url.origin;
    } catch {
      // Ogiltig adress — prova nästa.
    }
  }
  return undefined;
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
  const apiUrl = (process.env.CMS_API_URL ?? "${trimUrl(apiUrl)}").replace(/\\/+$/, "");
  const apiKey = process.env.CMS_API_KEY;
  if (!apiKey) {
    const message = "CMS_API_KEY saknas — fälten synkades INTE till sitecms.";
    if (process.argv.includes("--strict")) fail(message);
    console.warn(\`⚠ sitecms-sync: \${message}\`);
    if (process.env.CI) console.warn("  Lägg in CMS_API_KEY i miljövariablerna hos webbhotellet.");
    return;
  }

  const config = await loadConfig();
  const url = \`\${apiUrl}/api/v1/site/schema\`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({ ...config, siteUrl: siteUrl() }),
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

  console.log(\`✔ sitecms-sync: \${config.pages.length} sidor synkade\`);
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
  if (data.revalidateUrl === null) {
    console.warn("⚠ sitecms-sync: ingen revalidate-URL är angiven — ändringar syns först efter nästa deploy.");
  }
}

main().catch((err: unknown) => fail(err instanceof Error ? err.message : String(err)));
`;
}

// ---------------------------------------------------------------------------
// package.json (utdrag) för copy-paste-varianten
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
  return `// app/page.tsx — exempel (serverkomponent)
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

/** Kontrollera nyckeln från terminalen (nyckelbaserad route). */
export function healthCurlSnippet({ apiUrl = DEFAULT_CMS_URL }: { apiUrl?: string } = {}): string {
  return `curl -s -H "x-api-key: $CMS_API_KEY" \\
  ${trimUrl(apiUrl)}${SITE_API_PATH}/health`;
}

/**
 * Skickar en korrekt signerad test-webhook till revalidate-routen (samma som
 * sitecms skickar). Kräver bash och openssl.
 */
export function signedWebhookCurlSnippet({ domain }: Pick<SnippetContext, "domain"> = {}): string {
  return `TS=$(date +%s)
BODY="{\\"event\\":\\"content.updated\\",\\"site\\":\\"${PLACEHOLDER_SITE}\\",\\"timestamp\\":$TS}"
KEY_HASH=$(printf %s "$CMS_API_KEY" | openssl dgst -sha256 | sed 's/^.* //')
SIG=$(printf %s "$TS.$BODY" | openssl dgst -sha256 -hmac "$KEY_HASH" | sed 's/^.* //')

curl -s -X POST ${exampleOrigin(domain)}${REVALIDATE_ROUTE_PATH} \\
  -H "Content-Type: application/json" \\
  -H "x-sitecms-timestamp: $TS" \\
  -H "x-sitecms-signature: v1=$SIG" \\
  -d "$BODY"`;
}

/** Äldre form: hemligheten i bodyn. */
export function revalidateCurlSnippet({ domain }: Pick<SnippetContext, "domain"> = {}): string {
  return `curl -s -X POST ${exampleOrigin(domain)}${REVALIDATE_ROUTE_PATH} \\
  -H "Content-Type: application/json" \\
  -d '{"secret":"'"$CMS_REVALIDATE_SECRET"'"}'`;
}

/** Exempel på webhookens body (det som signeras). */
export function webhookBodyExample(site = PLACEHOLDER_SITE): string {
  return `{ "event": "content.updated", "site": "${site}", "timestamp": 1792560000 }`;
}

/** Föreslagen revalidate-URL för en kundsajt med init / snutten ovan. */
export function suggestedRevalidateUrl(domain?: string | null): string {
  return `${exampleOrigin(domain)}${REVALIDATE_ROUTE_PATH}`;
}

/** Webbhotell med deploy/build hooks — exempel, i bokstavsordning. */
export const DEPLOY_HOOK_HOSTS: readonly { name: string; term: string }[] = [
  { name: "Cloudflare Pages", term: "Deploy hook" },
  { name: "Netlify", term: "Build hook" },
  { name: "Render", term: "Deploy hook" },
  { name: "Vercel", term: "Deploy hook" },
];
