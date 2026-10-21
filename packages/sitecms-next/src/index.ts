/**
 * sitecms-next — typad sitecms-klient för Next.js App Router.
 *
 *   import { getContent, text, image } from "sitecms-next";
 *
 *   const content = await getContent();          // läser CMS_API_KEY (+ valfria CMS_API_URL, CMS_SITE)
 *   text(content, "home", "hero.title");
 *
 * Det enda som krävs är CMS_API_KEY — nyckeln identifierar sajten.
 * CMS_API_URL är valfri (default https://sitecms.se). CMS_SITE är valfri;
 * är den satt används de äldre slug-routerna precis som i 0.2.x.
 *
 * Behöver du flera sajter eller egna värden: `createSitecms({ apiKey })`
 * (eller som tidigare `createSitecms({ apiUrl, site, apiKey })`).
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

export type WebhookStatus = {
  /** true om sajten har en revalidate-URL i sitecms. */
  configured: boolean;
  /** Resultatet av senaste anropet till revalidate-URL:en, null om inget gjorts. */
  lastStatus: "ok" | "failed" | null;
  lastAt: string | null;
  lastError: string | null;
};

export type Health = {
  ok: true;
  site: { name: string; slug: string };
  pages: number;
  lastSchemaSyncAt: string | null;
  /** URL som sitecms anropar när innehåll sparas (saknas hos äldre sitecms-versioner). */
  revalidateUrl?: string | null;
  /** Status för senaste webhook-anropet (saknas hos äldre sitecms-versioner). */
  webhook?: WebhookStatus;
};

export type ResolvedBlock = { value: string; html: string; alt: string };

/** Publika adressen till sitecms, används när CMS_API_URL inte är satt. */
export const DEFAULT_API_URL = "https://sitecms.se";

export type SitecmsOptions = {
  /** Bas-URL till sitecms. Default CMS_API_URL, annars "https://sitecms.se". */
  apiUrl?: string;
  /**
   * Sajtens slug i sitecms (valfri). Satt → slug-routerna
   * `/api/v1/sites/<slug>/…` (som 0.2.x); annars identifierar nyckeln sajten
   * via `/api/v1/site/…`.
   */
  site?: string;
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

function env(name: string): string {
  return (typeof process !== "undefined" && process.env?.[name]?.trim()) || "";
}

/**
 * Bas-URL för API-anropen: slug-routerna om `site` är satt (som 0.2.x),
 * annars de nyckelbaserade `/api/v1/site`-routerna.
 */
export function apiBase(apiUrl: string | undefined, site?: string | null): string {
  const root = (apiUrl?.trim() || DEFAULT_API_URL).replace(/\/+$/, "");
  const slug = site?.trim();
  return slug ? `${root}/api/v1/sites/${encodeURIComponent(slug)}` : `${root}/api/v1/site`;
}

/**
 * Skapar en klient. Utelämnade värden läses från miljövariablerna
 * CMS_API_KEY (krävs), CMS_API_URL (default https://sitecms.se) och
 * CMS_SITE (valfri).
 */
export function createSitecms(input: Partial<SitecmsOptions> = {}) {
  const options: SitecmsOptions = {
    ...input,
    apiUrl: input.apiUrl ?? env("CMS_API_URL"),
    site: input.site ?? env("CMS_SITE"),
    apiKey: input.apiKey ?? env("CMS_API_KEY"),
  };
  const tag = options.tag ?? "sitecms";
  const doFetch = options.fetch ?? globalThis.fetch;

  if (!options.apiKey) throw new Error("sitecms-next: apiKey saknas (CMS_API_KEY).");

  const base = apiBase(options.apiUrl, options.site);

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

    /** Verifierar nyckeln (och slug om den används). Kastar SitecmsError (401/404) om något är fel. */
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

// Standardklienten byggs först vid första anropet, så att miljövariablerna
// hinner laddas och så att en import aldrig kastar under bygget.
let defaultClient: Sitecms | null = null;
function client(): Sitecms {
  return (defaultClient ??= createSitecms());
}

/** Hela sajtens innehåll (standardklienten, läser env). */
export function getContent(): Promise<Content> {
  return client().getContent();
}
/** Publicerade inlägg, nyast först (standardklienten, läser env). */
export function getPosts(): Promise<PostSummary[]> {
  return client().getPosts();
}
/** Ett publicerat inlägg eller null (standardklienten, läser env). */
export function getPost(slug: string): Promise<Post | null> {
  return client().getPost(slug);
}
/** Verifierar nyckeln (standardklienten, läser env). */
export function health(): Promise<Health> {
  return client().health();
}

function subtleCrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("sitecms-next: Web Crypto (globalThis.crypto.subtle) saknas. Använd Node 20+ eller en Edge-runtime.");
  }
  return subtle;
}

/**
 * Jämför revalidate-hemligheten i konstant tid via SHA-256 (Web Crypto),
 * fungerar i både Node och Edge. Den färdiga route-handlern finns i
 * `sitecms-next/revalidate`.
 */
export async function verifyRevalidateSecret(received: unknown, expected: string | undefined): Promise<boolean> {
  if (typeof received !== "string" || !received || !expected) return false;
  const enc = new TextEncoder();
  const subtle = subtleCrypto();
  const [a, b] = await Promise.all([
    subtle.digest("SHA-256", enc.encode(received)),
    subtle.digest("SHA-256", enc.encode(expected)),
  ]);
  const va = new Uint8Array(a);
  const vb = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}

// ---------------------------------------------------------------------------
// Signerad webhook (x-sitecms-signature)
// ---------------------------------------------------------------------------

/** Max avvikelse mellan x-sitecms-timestamp och klockan, i sekunder. */
export const WEBHOOK_TOLERANCE_SECONDS = 300;

export type WebhookHeaders = Headers | Record<string, string | string[] | undefined | null>;

export type VerifyWebhookOptions = {
  /** Exakt den body som togs emot (läs `await request.text()` en gång). */
  rawBody: string | Uint8Array | ArrayBuffer;
  /** Request-headers: ett `Headers`-objekt eller ett vanligt objekt (t.ex. från Express/Node). */
  headers: WebhookHeaders;
  /** Sajtens API-nyckel. Default process.env.CMS_API_KEY. Tom sträng = kontrollera inte signaturen. */
  apiKey?: string;
  /**
   * Äldre revalidate-hemlighet: godkänn även om JSON-bodyns `secret` matchar.
   * Default process.env.CMS_REVALIDATE_SECRET. Tom sträng = stäng av.
   */
  legacySecret?: string;
  /** Default 300 sekunder. */
  toleranceSeconds?: number;
};

function readHeader(headers: WebhookHeaders, name: string): string | null {
  if (typeof (headers as Headers).get === "function") return (headers as Headers).get(name);
  const record = headers as Record<string, string | string[] | undefined | null>;
  for (const [key, value] of Object.entries(record)) {
    if (key.toLowerCase() !== name) continue;
    if (value == null) return null;
    return Array.isArray(value) ? value.join(",") : String(value);
  }
  return null;
}

function toBytes(raw: string | Uint8Array | ArrayBuffer): Uint8Array {
  if (typeof raw === "string") return new TextEncoder().encode(raw);
  return raw instanceof Uint8Array ? raw : new Uint8Array(raw);
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Jämför två strängar i konstant tid (relativt längden). */
function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) | 0) ^ (b.charCodeAt(i) | 0);
  return diff === 0;
}

/**
 * Verifierar ett webhook-anrop från sitecms. Fungerar i Node 18+ (med Web
 * Crypto) och Edge.
 *
 * Godkänt om något av följande gäller:
 * - `x-sitecms-signature` innehåller en `v1=`-signatur som stämmer:
 *   HMAC-SHA256 med nyckeln sha256hex(apiKey) över `${timestamp}.${rawBody}`,
 *   och `x-sitecms-timestamp` ligger inom ±toleranceSeconds från nu.
 * - `legacySecret` är satt och JSON-bodyns `secret` matchar (äldre sajter).
 *
 *   const rawBody = await request.text();
 *   if (!(await verifyWebhook({ rawBody, headers: request.headers }))) return new Response(null, { status: 401 });
 */
export async function verifyWebhook(options: VerifyWebhookOptions): Promise<boolean> {
  const apiKey = (options.apiKey ?? env("CMS_API_KEY")).trim();
  const legacySecret = (options.legacySecret ?? env("CMS_REVALIDATE_SECRET")).trim();
  const tolerance = options.toleranceSeconds ?? WEBHOOK_TOLERANCE_SECONDS;
  const raw = toBytes(options.rawBody);

  if (apiKey) {
    const signature = readHeader(options.headers, "x-sitecms-signature");
    const timestamp = readHeader(options.headers, "x-sitecms-timestamp")?.trim() ?? "";
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (signature && /^\d{1,15}$/.test(timestamp) && Math.abs(nowSeconds - Number(timestamp)) <= tolerance) {
      const subtle = subtleCrypto();
      const enc = new TextEncoder();
      const keyHash = toHex(await subtle.digest("SHA-256", enc.encode(apiKey)));
      const hmacKey = await subtle.importKey("raw", enc.encode(keyHash), { name: "HMAC", hash: "SHA-256" }, false, [
        "sign",
      ]);
      const prefix = enc.encode(`${timestamp}.`);
      const message = new Uint8Array(prefix.length + raw.length);
      message.set(prefix, 0);
      message.set(raw, prefix.length);
      const expected = toHex(await subtle.sign("HMAC", hmacKey, message));

      let match = false;
      for (const part of signature.split(",")) {
        const entry = part.trim();
        if (!entry.startsWith("v1=")) continue;
        // Gå igenom alla poster utan att avbryta tidigt.
        if (safeEqual(entry.slice(3).trim().toLowerCase(), expected)) match = true;
      }
      if (match) return true;
    }
  }

  if (legacySecret) {
    let body: unknown = null;
    try {
      body = JSON.parse(new TextDecoder().decode(raw));
    } catch {
      body = null;
    }
    const secret = body && typeof body === "object" ? (body as { secret?: unknown }).secret : undefined;
    if (await verifyRevalidateSecret(secret, legacySecret)) return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Schema (sitecms.config.ts)
// ---------------------------------------------------------------------------

export type SitecmsBlock = {
  /** Unik per sida. a–z, 0–9, punkt, bindestreck, understreck. */
  key: string;
  /** Default "text". */
  type?: BlockType;
  label?: string;
  help?: string;
  default?: string;
  defaultAlt?: string;
};

export type SitecmsPage = {
  slug: string;
  title: string;
  description?: string;
  blocks?: SitecmsBlock[];
};

export type SitecmsConfig = {
  version?: 1;
  pages: SitecmsPage[];
  prune?: boolean;
};

/** Identitetsfunktion för typad config: `export default defineConfig({ ... })`. */
export function defineConfig(config: SitecmsConfig): SitecmsConfig {
  return config;
}
