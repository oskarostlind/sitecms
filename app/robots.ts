import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Panelen, API:t och engångslänkar (bekräfta, återställ, inbjudan) har inget att ranka.
        disallow: ["/admin", "/api/", "/verify", "/reset", "/invite", "/logout"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
