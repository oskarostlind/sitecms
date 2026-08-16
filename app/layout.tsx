import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "sitecms — redigera din hemsida enkelt och tryggt",
  description:
    "Sitecms ger småföretag och hantverkare full kontroll över sin hemsida: texter, bilder, inlägg, tjänster och priser — allt från en enkel panel.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sv">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
