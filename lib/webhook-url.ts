import { displayDomain } from "@/lib/site-url";

/**
 * Rena hjälpare för att räkna fram en sajts revalidate-URL (ingen databas,
 * testas i scripts/webhook-url-test.ts).
 */

/** Standardsökvägen som `npx sitecms-next init` skapar på kundsajten. */
export const REVALIDATE_PATH = "/api/sitecms/revalidate";

function isPrivateIPv4(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return (
    a === 0 || // 0.0.0.0/8
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) || // link-local
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) // CGNAT
  );
}

/** true för värdnamn som aldrig kan vara en publik kundsajt. */
function isNonPublicHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (isPrivateIPv4(host)) return true;
  if (host.startsWith("[")) {
    // IPv6-literal: loopback, ospecificerad, unik lokal (fc00::/7), link-local (fe80::/10)
    // och IPv4-mappade adresser avvisas. Publika IPv6-literaler är så ovanliga
    // för kundsajter att de också avvisas — ange domänen i stället.
    return true;
  }
  // Ett namn utan punkt ("intranet") är inte en publik domän.
  if (!host.includes(".")) return true;
  return false;
}

/**
 * Returnerar origin ("https://kund.se") om värdet är en giltig, publik
 * https-adress, annars null. Sökväg, query och fragment ignoreras. Avvisar
 * http:, inloggningsuppgifter i URL:en, localhost, *.local(host), privata
 * IPv4-nät (10/8, 127/8, 172.16/12, 192.168/16 m.fl.) och IP-literaler för IPv6.
 */
export function publicHttpsOrigin(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (isNonPublicHost(url.hostname)) return null;
  return url.origin;
}

/** Revalidate-URL för en sajt-URL som kundsajten rapporterat (schema-sync), eller null. */
export function revalidateUrlFromSiteUrl(siteUrl: unknown): { revalidateUrl: string; hostname: string } | null {
  const origin = publicHttpsOrigin(siteUrl);
  if (!origin) return null;
  return { revalidateUrl: `${origin}${REVALIDATE_PATH}`, hostname: new URL(origin).hostname };
}

/**
 * "https://www.Firma.se/om-oss/" → "www.firma.se". Tar bort protokoll,
 * sökväg, query, fragment och avslutande snedstreck. Tom sträng om inget finns.
 */
export function normalizeDomain(domain: string | null | undefined): string {
  return displayDomain(domain).split(/[/?#]/, 1)[0].trim().toLowerCase();
}

/**
 * Standard-revalidate-URL för en domän som skrivits in i panelen
 * ("firma.se" → "https://firma.se/api/sitecms/revalidate"), eller null om
 * domänen saknas eller inte ser ut som en publik domän.
 */
export function revalidateUrlForDomain(domain: string | null | undefined): string | null {
  const host = normalizeDomain(domain);
  if (!host || /\s/.test(host)) return null;
  const origin = publicHttpsOrigin(`https://${host}`);
  return origin ? `${origin}${REVALIDATE_PATH}` : null;
}
