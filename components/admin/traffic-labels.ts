/**
 * Läsbara etiketter för trafikdimensionerna i panelen (docs/SEO-TRAFIK.md §2/§8).
 * Ren modul utan db-import.
 */

const SOURCE_NAMES: Record<string, string> = {
  direkt: "Direkt",
  google: "Google",
  bing: "Bing",
  duckduckgo: "DuckDuckGo",
  ecosia: "Ecosia",
  yahoo: "Yahoo",
  startpage: "Startpage",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  instagram: "Instagram",
  x: "X (Twitter)",
  reddit: "Reddit",
  github: "GitHub",
  npm: "npm",
  "ai:chatgpt": "ChatGPT",
  "ai:perplexity": "Perplexity",
  "ai:claude": "Claude",
  "ai:gemini": "Gemini",
};

/** `direkt` → "Direkt", `utm:nyhetsbrev` → "nyhetsbrev (kampanj)", `ref:example.com` → "example.com", `ai:chatgpt` → "ChatGPT". */
export function sourceLabel(value: string): string {
  const named = SOURCE_NAMES[value];
  if (named) return named;
  if (value.startsWith("utm:")) return `${value.slice(4) || "okänd"} (kampanj)`;
  if (value.startsWith("ref:")) return value.slice(4) || "Okänd hänvisning";
  if (value.startsWith("ai:")) {
    const name = value.slice(3);
    return name ? name.charAt(0).toUpperCase() + name.slice(1) : "AI-assistent";
  }
  return value || "Okänd";
}

const regionNames = (() => {
  try {
    return new Intl.DisplayNames(["sv"], { type: "region" });
  } catch {
    return null;
  }
})();

/** "SE" → "Sverige", "ZZ"/okänt → "Okänt". */
export function countryName(code: string): string {
  const upper = (code || "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper) || upper === "ZZ") return "Okänt";
  try {
    const name = regionNames?.of(upper);
    return name && name !== upper ? name : upper;
  } catch {
    return upper;
  }
}

/** "SE" → 🇸🇪 via regional indicator symbols. Okänt → 🌐. */
export function countryFlag(code: string): string {
  const upper = (code || "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper) || upper === "ZZ") return "🌐";
  const base = 0x1f1e6 - 65;
  return String.fromCodePoint(base + upper.charCodeAt(0), base + upper.charCodeAt(1));
}

const DEVICE_NAMES: Record<string, string> = {
  mobile: "Mobil",
  tablet: "Surfplatta",
  desktop: "Dator",
};

/** `mobile` → "Mobil", `tablet` → "Surfplatta", `desktop` → "Dator". */
export function deviceLabel(value: string): string {
  return DEVICE_NAMES[value] ?? (value || "Okänd");
}

/** Sökväg: "/" → "/ (startsidan)", "/…" (överflöd) → "Övriga sidor". */
export function pathLabel(value: string): string {
  if (value === "/") return "/ (startsidan)";
  if (value === "/…") return "Övriga sidor";
  return value || "/";
}
