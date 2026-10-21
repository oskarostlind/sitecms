import type { Metadata } from "next";
import { GuideShell } from "@/components/guides/GuideShell";

export const metadata: Metadata = {
  title: "Koppla Next.js till ett CMS – dokumentation",
  description:
    "Koppla en Next.js-sajt till sitecms med ett kommando och en miljövariabel: npx sitecms-next init, typad klient, schema-sync, signerad webhook och API-referens.",
  alternates: { canonical: "/docs" },
};

/** Samma mörka ram (header + footer) som guiderna — docs/BRAND.md. */
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <GuideShell active="docs">{children}</GuideShell>;
}
