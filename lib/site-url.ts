/**
 * Domänen lagras som den skrevs in ("firma.se", ibland "https://firma.se/").
 * De här hjälparna ger en visningsvänlig variant och en klickbar URL.
 */

/** "https://www.firma.se/" → "www.firma.se". Tom sträng om domän saknas. */
export function displayDomain(domain: string | null | undefined): string {
  return (domain ?? "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
}

/** Extern URL till sajten, eller null om domän saknas. */
export function siteUrl(domain: string | null | undefined): string | null {
  const host = displayDomain(domain);
  return host ? `https://${host}` : null;
}
