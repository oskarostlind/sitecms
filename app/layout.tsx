import "@fontsource-variable/inter";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SITE_LOCALE, SITE_NAME, SITE_URL } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "sitecms – låt kunden redigera hemsidan själv",
    template: "%s | sitecms",
  },
  description:
    "Svenskt CMS för småföretag: ändra texter, bilder, nyheter, tjänster och priser på hemsidan själv. Utvecklaren kopplar sajten på tio minuter.",
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    locale: SITE_LOCALE,
    siteName: SITE_NAME,
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false, email: false, address: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sv">
      <body className="min-h-screen bg-neutral-50 font-sans text-neutral-900 antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
