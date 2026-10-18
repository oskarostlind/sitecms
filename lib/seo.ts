/**
 * SEO-konstanter. Kanonisk värd är hårdkodad (inte läst från APP_URL, som
 * används till mejllänkar och kan peka på en förhandsgranskning). www.sitecms.se
 * och sitecms-zeta.vercel.app ska 308-redirecta hit.
 */
export const SITE_URL = "https://sitecms.se";
export const SITE_NAME = "sitecms";
export const SITE_LOCALE = "sv_SE";
export const CONTACT_EMAIL = "info@oskarostlind.se";

/** Absolut URL för en sökväg ("/docs" → "https://sitecms.se/docs"). */
export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`.replace(/\/$/, "") || SITE_URL;
}

/** Robots-värde för sidor som inte ska indexeras (panel, engångslänkar, inloggning). */
export const NOINDEX = { index: false, follow: false } as const;

export type JsonLd = Record<string, unknown>;

export const organizationJsonLd: JsonLd = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/icon`,
  email: CONTACT_EMAIL,
};

export const websiteJsonLd: JsonLd = {
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: SITE_NAME,
  inLanguage: "sv-SE",
  publisher: { "@id": `${SITE_URL}/#organization` },
};

export const softwareJsonLd: JsonLd = {
  "@type": "SoftwareApplication",
  "@id": `${SITE_URL}/#software`,
  name: SITE_NAME,
  url: SITE_URL,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Webb",
  inLanguage: "sv-SE",
  description:
    "Svenskt CMS där småföretag redigerar texter, bilder, nyheter, tjänster och priser på sin hemsida själva — och där utvecklaren kopplar sajten med ett npm-paket.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "SEK", description: "Gratis att börja" },
  publisher: { "@id": `${SITE_URL}/#organization` },
};

export function breadcrumbJsonLd(items: { name: string; path: string }[]): JsonLd {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** Serialiserar en eller flera noder som ett @graph-dokument för <script type="application/ld+json">. */
export function jsonLdScript(...nodes: JsonLd[]): string {
  return JSON.stringify({ "@context": "https://schema.org", "@graph": nodes }).replace(/</g, "\\u003c");
}
