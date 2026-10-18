/**
 * First-touch attribution: var kom besökaren ifrån första gången?
 *
 * Middleware sätter kakan `sc_src` på första publika sidvisningen (UTM eller
 * referer + landningssida). Vid registrering sparas den på kontot, så att
 * /admin/tillvaxt kan visa konton per källa utan någon tredjepartsanalys.
 *
 * Edge-säker: inga Node-API:er, ingen databas.
 */

export const ATTRIBUTION_COOKIE = "sc_src";
export const ATTRIBUTION_MAX_AGE = 60 * 60 * 24 * 90; // 90 dagar

export type Attribution = { source: string; landing: string };

const SEARCH_ENGINES: [RegExp, string][] = [
  [/(^|\.)google\./, "google"],
  [/(^|\.)bing\.com$/, "bing"],
  [/(^|\.)duckduckgo\.com$/, "duckduckgo"],
  [/(^|\.)ecosia\.org$/, "ecosia"],
  [/(^|\.)yahoo\./, "yahoo"],
  [/(^|\.)startpage\.com$/, "startpage"],
];

const NAMED: [RegExp, string][] = [
  [/(^|\.)(chatgpt\.com|openai\.com)$/, "ai:chatgpt"],
  [/(^|\.)perplexity\.ai$/, "ai:perplexity"],
  [/(^|\.)claude\.ai$/, "ai:claude"],
  [/(^|\.)gemini\.google\.com$/, "ai:gemini"],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, "linkedin"],
  [/(^|\.)(facebook\.com|fb\.com|l\.facebook\.com)$/, "facebook"],
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)(x\.com|twitter\.com|t\.co)$/, "x"],
  [/(^|\.)reddit\.com$/, "reddit"],
  [/(^|\.)github\.com$/, "github"],
  [/(^|\.)npmjs\.com$/, "npm"],
];

/** Klassar en referer-värd till en kort källa. */
export function classifyReferrer(host: string): string {
  const h = host.toLowerCase().replace(/^www\./, "");
  for (const [re, name] of NAMED) if (re.test(h)) return name;
  for (const [re, name] of SEARCH_ENGINES) if (re.test(h)) return name;
  return `ref:${h}`;
}

/**
 * Räknar ut källan för en första sidvisning. Returnerar null för interna
 * referers (då är besökaren redan på sajten och ska inte få ny källa).
 */
export function computeAttribution(input: {
  url: URL;
  referer: string | null;
  ownHosts: string[];
}): Attribution | null {
  const { url, referer, ownHosts } = input;
  const landing = url.pathname.slice(0, 200);
  const utmSource = url.searchParams.get("utm_source")?.trim().toLowerCase();
  if (utmSource) {
    const medium = url.searchParams.get("utm_medium")?.trim().toLowerCase();
    return { source: `utm:${utmSource}${medium ? `/${medium}` : ""}`.slice(0, 80), landing };
  }
  if (!referer) return { source: "direkt", landing };
  let refHost: string;
  try {
    refHost = new URL(referer).hostname;
  } catch {
    return { source: "direkt", landing };
  }
  if (ownHosts.some((h) => refHost === h || refHost.endsWith(`.${h}`))) return null;
  return { source: classifyReferrer(refHost).slice(0, 80), landing };
}

export function encodeAttribution(a: Attribution): string {
  return encodeURIComponent(JSON.stringify(a));
}

export function decodeAttribution(raw: string | undefined | null): Attribution | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<Attribution>;
    if (typeof parsed.source !== "string" || typeof parsed.landing !== "string") return null;
    return { source: parsed.source.slice(0, 80), landing: parsed.landing.slice(0, 200) };
  } catch {
    return null;
  }
}

/** Grupperar källor för rapporten: "google" → "Sök", "ai:chatgpt" → "AI" osv. */
export function sourceGroup(source: string | null): string {
  if (!source) return "Okänd (före mätning)";
  if (source === "direkt") return "Direkt";
  if (source === "inbjudan") return "Inbjudan";
  if (["google", "bing", "duckduckgo", "ecosia", "yahoo", "startpage"].includes(source)) return "Sök (organiskt)";
  if (source.startsWith("ai:")) return "AI-assistenter";
  if (["linkedin", "facebook", "instagram", "x", "reddit"].includes(source)) return "Sociala medier";
  if (source === "github" || source === "npm") return "GitHub/npm";
  if (source.startsWith("utm:")) return "Kampanj (UTM)";
  return "Hänvisning";
}
