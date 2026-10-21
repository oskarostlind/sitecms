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

// ---------------------------------------------------------------------------
// Validering när en revalidate-URL sparas i panelen
// ---------------------------------------------------------------------------

/** Felkoder som updateSiteSettings skickar tillbaka som `?error=`. */
export type RevalidateUrlProblem = "revalidate-url-invalid" | "revalidate-url-credentials" | "revalidate-url-internal";

/** Svenska felmeddelanden för koderna ovan (installningar- och integrationssidan). */
export const REVALIDATE_URL_ERROR_MESSAGES: Record<RevalidateUrlProblem, string> = {
  "revalidate-url-invalid":
    "Revalidate-URL:en är inte en giltig adress — ange hela adressen, t.ex. https://kund.se/api/sitecms/revalidate.",
  "revalidate-url-credentials": "Revalidate-URL:en får inte innehålla användarnamn eller lösenord.",
  "revalidate-url-internal":
    "Revalidate-URL:en pekar på en intern adress (localhost, ett privat nät eller liknande). Ange sajtens publika adress.",
};

/**
 * Textkontroll av en revalidate-URL som skrivs in i panelen: giltig http(s)-
 * adress, utan inloggningsuppgifter, och inte localhost/privat IP-literal
 * (samma regler som publicHttpsOrigin, men http:// är tillåtet eftersom
 * befintliga sajter kan använda det). DNS kontrolleras först när webhooken
 * skickas (lib/webhook-http.ts). Returnerar null när adressen är godkänd.
 */
export function revalidateUrlProblem(value: string): RevalidateUrlProblem | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) return "revalidate-url-invalid";
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return "revalidate-url-invalid";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return "revalidate-url-invalid";
  if (url.username || url.password) return "revalidate-url-credentials";
  if (isNonPublicHost(url.hostname)) return "revalidate-url-internal";
  return null;
}

// ---------------------------------------------------------------------------
// Maskering — revalidate-URL:er kan vara deploy hooks (hemliga URL:er)
// ---------------------------------------------------------------------------

/** Ersätter den hemliga delen av en maskerad adress. */
export const MASK = "••••";

/**
 * Revalidate-URL:en så som den får visas utanför panelens ägarvy (health-API,
 * schema-svaret, CLI, loggar). Deploy hook-URL:er är hemligheter — den som
 * har URL:en kan starta byggen — så bara standardsökvägen visas i sin helhet:
 *
 *   https://kund.se/api/sitecms/revalidate?x=1  → https://kund.se/api/sitecms/revalidate
 *   https://api.netlify.com/build_hooks/abc123  → https://api.netlify.com/••••
 *   https://user:pass@kund.se/hook              → https://kund.se/••••
 *
 * Inloggningsuppgifter, query och fragment tas alltid bort. Ogiltiga värden
 * blir bara "••••". null/tom sträng → null.
 */
export function maskRevalidateUrl(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return MASK;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return MASK;
  // url.origin innehåller aldrig användarnamn/lösenord.
  return url.pathname === REVALIDATE_PATH ? `${url.origin}${REVALIDATE_PATH}` : `${url.origin}/${MASK}`;
}

/** Allt som ser ut som en absolut URL (scheme://…) fram till blanksteg eller citattecken. */
const URL_IN_TEXT = /\b[a-z][a-z0-9+.-]*:\/\/[^\s"'<>`]+/gi;

/**
 * Tvättar en fritext (felmeddelande, loggrad) innan den sparas, loggas eller
 * visas: varje URL ersätts med sin maskerade form (maskRevalidateUrl), så att
 * inloggningsuppgifter, query-strängar och hemliga sökvägar (deploy hooks)
 * aldrig hamnar i last_webhook_error, ?detail=, aktivitetsloggen eller
 * serverloggar. Ren funktion — testas i scripts/webhook-url-test.ts.
 */
export function redactUrls(text: string): string {
  return text.replace(URL_IN_TEXT, (match) => {
    // Skiljetecken direkt efter en URL ("… https://x.se/a." ) hör till meningen.
    const trailing = /[.,;:!?)\]}]+$/.exec(match)?.[0] ?? "";
    const candidate = trailing ? match.slice(0, -trailing.length) : match;
    let masked: string | null = null;
    try {
      const url = new URL(candidate);
      masked = url.protocol === "https:" || url.protocol === "http:" ? maskRevalidateUrl(candidate) : null;
    } catch {
      masked = null;
    }
    if (!masked || masked === MASK) {
      const scheme = /^[a-z][a-z0-9+.-]*:\/\//i.exec(candidate)?.[0] ?? "";
      masked = `${scheme}${MASK}`;
    }
    return masked + trailing;
  });
}

/** Ett fel som en tvättad, kort sträng för serverloggar (ingen URL, inga hemligheter i query). */
export function errorForLog(err: unknown): string {
  if (err instanceof Error) {
    const cause = (err as Error & { cause?: unknown }).cause;
    const causeText = cause instanceof Error ? ` (orsak: ${cause.name}: ${cause.message})` : "";
    return redactUrls(`${err.name}: ${err.message}${causeText}`);
  }
  return redactUrls(String(err));
}
