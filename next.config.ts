import type { NextConfig } from "next";

/**
 * Säkerhetsheaders. När flera regler matchar samma sökväg vinner den sista,
 * så de striktare reglerna ligger efter de allmänna.
 */
const BASE_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

/**
 * Sidor som kan visa hemligheter eller bära engångstokens i URL:en
 * (verifiering, återställning, inbjudan): ingen cache i webbläsare eller
 * proxyer, ingen Referer till externa resurser och ingen indexering.
 */
const SENSITIVE_HEADERS = [
  { key: "Cache-Control", value: "private, no-store, max-age=0" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const SENSITIVE_PATHS = ["/admin/:path*", "/verify", "/reset", "/invite", "/login", "/signup", "/forgot"];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/:path*", headers: BASE_HEADERS },
      ...SENSITIVE_PATHS.map((source) => ({ source, headers: SENSITIVE_HEADERS })),
    ];
  },
};

export default nextConfig;
