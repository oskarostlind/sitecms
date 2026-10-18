import type { MetadataRoute } from "next";
import { GUIDES } from "@/lib/guides";
import { absoluteUrl } from "@/lib/seo";

/** Bara sidor med eget innehåll. Panelen och engångslänkar är utelämnade. */
export default function sitemap(): MetadataRoute.Sitemap {
  const latestGuide = GUIDES.map((g) => g.modified).sort().at(-1) ?? "2026-10-18";
  return [
    { url: absoluteUrl("/"), lastModified: "2026-10-18", changeFrequency: "monthly", priority: 1 },
    { url: absoluteUrl("/guider"), lastModified: latestGuide, changeFrequency: "weekly", priority: 0.9 },
    ...GUIDES.map((g) => ({
      url: absoluteUrl(`/guider/${g.slug}`),
      lastModified: g.modified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    { url: absoluteUrl("/docs"), lastModified: "2026-10-18", changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/signup"), lastModified: "2026-10-18", changeFrequency: "yearly", priority: 0.5 },
    { url: absoluteUrl("/integritet"), lastModified: "2026-10-18", changeFrequency: "yearly", priority: 0.2 },
  ];
}
