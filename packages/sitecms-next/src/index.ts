/**
 * @sitecms/next — typad sitecms-klient för Next.js App Router.
 *
 *   import { createSitecms } from "@sitecms/next";
 *   export const cms = createSitecms({
 *     apiUrl: process.env.CMS_API_URL!,
 *     site: process.env.CMS_SITE!,
 *     apiKey: process.env.CMS_API_KEY!,
 *   });
 *
 *   const content = await cms.getContent();
 *   cms.text(content, "home", "hero.title");
 *
 * Inga beroenden. Alla anrop använder `fetch` med `next: { tags: [tag] }` så
 * att en revalidate-route kan tömma cachen med `revalidateTag("sitecms")`.
 * Samma kod som copy-paste-varianten `lib/sitecms.ts` i panelen.
 */

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

export type Health = {
  ok: true;
  site: { name: string; slug: string };
  pages: number;
  lastSchemaSyncAt: string | null;
};

export type ResolvedBlock = { value: string; html: string; alt: string };

export type SitecmsOptions = {
  /** Bas-URL till sitecms, t.ex. "https://sitecms-zeta.vercel.app". */
  apiUrl: string;
  /** Sajtens slug i sitecms. */
  site: string;
  /** API-nyckel (skickas som x-api-key). Håll den på serversidan. */
  apiKey: string;
  /** Cache-tagg för Next.js fetch-cachen (default "sitecms"). */
  tag?: string;
  /** Egen fetch, t.ex. för tester. Default globalThis.fetch. */
  fetch?: typeof fetch;
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Ett block som alltid går att rendera: tomma strängar i stället för null.
 * `html` är färdig HTML för richtext och HTML-escapad text för övriga typer.
 */
export function block(content: Content, pageSlug: string, key: string): ResolvedBlock {
  const found = content.pages.find((p) => p.slug === pageSlug)?.blocks.find((b) => b.key === key);
  const value = found?.value ?? "";
  return {
    value,
    html: found?.html ?? escapeHtml(value),
    alt: found?.alt ?? "",
  };
}

/** Textvärdet för ett block, eller `fallback` om det är tomt. */
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

type NextFetchInit = RequestInit & { next?: { tags?: string[]; revalidate?: number | false } };

export function createSitecms(options: SitecmsOptions) {
  const apiUrl = options.apiUrl.trim().replace(/\/+$/, "");
  const tag = options.tag ?? "sitecms";
  const doFetch = options.fetch ?? globalThis.fetch;

  if (!apiUrl) throw new Error("@sitecms/next: apiUrl saknas (CMS_API_URL).");
  if (!options.site) throw new Error("@sitecms/next: site saknas (CMS_SITE).");
  if (!options.apiKey) throw new Error("@sitecms/next: apiKey saknas (CMS_API_KEY).");

  const base = `${apiUrl}/api/v1/sites/${encodeURIComponent(options.site)}`;

  async function request<T>(path: string, { allow404 = false } = {}): Promise<T | null> {
    const init: NextFetchInit = {
      headers: { "x-api-key": options.apiKey },
      next: { tags: [tag] },
    };
    const res = await doFetch(`${base}${path}`, init);

    if (allow404 && res.status === 404) return null;

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new SitecmsError(`sitecms: ${body?.error ?? res.statusText} (HTTP ${res.status}, ${path})`, res.status);
    }

    return (await res.json()) as T;
  }

  return {
    /** Cache-taggen som alla anrop använder. */
    tag,

    /** Hela sajtens innehåll: sidor med block, tjänster och SEO. */
    async getContent(): Promise<Content> {
      return (await request<Content>("/content"))!;
    },

    /** Publicerade inlägg, nyast först (utan brödtext). */
    async getPosts(): Promise<PostSummary[]> {
      const data = await request<{ posts: PostSummary[] }>("/posts");
      return data?.posts ?? [];
    },

    /** Ett publicerat inlägg, eller null om det inte finns. */
    async getPost(slug: string): Promise<Post | null> {
      const data = await request<{ post: Post }>(`/posts/${encodeURIComponent(slug)}`, { allow404: true });
      return data?.post ?? null;
    },

    /** Verifierar slug + nyckel. Kastar SitecmsError (401/404) om något är fel. */
    async health(): Promise<Health> {
      return (await request<Health>("/health"))!;
    },

    block,
    text,
    image,
    seo,
  };
}

export type Sitecms = ReturnType<typeof createSitecms>;

/**
 * Hjälpare för `app/api/sitecms/revalidate/route.ts`:
 *
 *   import { revalidateTag } from "next/cache";
 *   import { verifyRevalidateSecret } from "@sitecms/next";
 *
 *   export async function POST(request: Request) {
 *     const body = await request.json().catch(() => null);
 *     if (!(await verifyRevalidateSecret(body?.secret, process.env.CMS_REVALIDATE_SECRET))) {
 *       return Response.json({ revalidated: false }, { status: 401 });
 *     }
 *     revalidateTag("sitecms");
 *     return Response.json({ revalidated: true });
 *   }
 *
 * Jämför i konstant tid via SHA-256 (Web Crypto), fungerar i både Node och Edge.
 */
export async function verifyRevalidateSecret(received: unknown, expected: string | undefined): Promise<boolean> {
  if (typeof received !== "string" || !received || !expected) return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(received)),
    crypto.subtle.digest("SHA-256", enc.encode(expected)),
  ]);
  const va = new Uint8Array(a);
  const vb = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}

// ---------------------------------------------------------------------------
// Schema (sitecms.config.ts)
// ---------------------------------------------------------------------------

export type SitecmsBlock = {
  /** Unik per sida. a–z, 0–9, punkt, bindestreck, understreck. */
  key: string;
  type: BlockType;
  label?: string;
  help?: string;
  default?: string;
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
  prune?: boolean;
};

/** Identitetsfunktion för typad config: `export default defineConfig({ ... })`. */
export function defineConfig(config: SitecmsConfig): SitecmsConfig {
  return config;
}
