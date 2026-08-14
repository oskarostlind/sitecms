import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "sitecms",
  description: "Redigera din hemsida — enkelt och tryggt.",
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
