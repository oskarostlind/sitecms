import { and, eq } from "drizzle-orm";
import { db, apiKeys, sites } from "@/lib/db";
import { hashApiKey } from "@/lib/api-keys";

export type ApiSite = {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
};

export type ApiAuthResult =
  | { ok: true; site: ApiSite }
  | { ok: false; status: number; error: string };

/**
 * Resolves a site by its public slug and checks the "x-api-key" header
 * against that site's api_keys. Only SHA-256 hashes are stored, so the
 * header is hashed and looked up — the plaintext key never touches the
 * database. Used by every route under /api/v1/sites.
 */
export async function authenticateSite(slug: string, request: Request): Promise<ApiAuthResult> {
  const [site] = await db
    .select({ id: sites.id, name: sites.name, slug: sites.slug, domain: sites.domain })
    .from(sites)
    .where(eq(sites.slug, slug))
    .limit(1);

  if (!site) {
    return { ok: false, status: 404, error: "Sajten hittades inte." };
  }

  const apiKey = request.headers.get("x-api-key")?.trim();
  if (!apiKey || apiKey.length > 200) {
    return { ok: false, status: 401, error: "API-nyckel saknas (header x-api-key)." };
  }

  const [match] = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(and(eq(apiKeys.siteId, site.id), eq(apiKeys.keyHash, hashApiKey(apiKey))))
    .limit(1);

  if (!match) {
    return { ok: false, status: 401, error: "Ogiltig API-nyckel för denna sajt." };
  }

  return { ok: true, site };
}

/**
 * No CDN caching: the Vercel edge cache does not vary on the x-api-key
 * header, so a "public, s-maxage" response authorized by a valid key would
 * be served to unauthenticated requests for the cache lifetime. Customer
 * sites cache on their side (Next fetch cache + on-demand revalidation),
 * so serving fresh from the API also keeps the <60s revalidation honest.
 */
export const CONTENT_CACHE_HEADERS: Record<string, string> = {
  "Cache-Control": "private, no-store",
};
