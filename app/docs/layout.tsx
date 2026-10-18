import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Logo } from "@/components/ui";

export const metadata: Metadata = {
  title: "Koppla Next.js till ett CMS – dokumentation",
  description:
    "Koppla en Next.js-sajt till sitecms på tio minuter med npm-paketet sitecms-next: typad klient, schema-sync, revalidering och API-referens.",
  alternates: { canonical: "/docs" },
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 text-neutral-900">
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/85 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="sitecms startsida" className="rounded-md">
              <Logo />
            </Link>
            <span aria-hidden className="h-5 w-px bg-neutral-200" />
            <Link href="/docs" className="text-sm font-medium text-neutral-600 hover:text-neutral-900">
              Dokumentation
            </Link>
          </div>
          <nav className="flex items-center gap-2">
            <ButtonLink href="/login" variant="ghost" className="hidden sm:inline-flex">
              Logga in
            </ButtonLink>
            <ButtonLink href="/signup" variant="primary">
              Skapa konto
            </ButtonLink>
          </nav>
        </div>
      </header>

      {children}

      <footer className="mt-auto border-t border-neutral-200 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-sm text-neutral-500 sm:flex-row">
          <span>&copy; {new Date().getFullYear()} sitecms</span>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-neutral-700">
              Startsida
            </Link>
            <Link href="/login" className="hover:text-neutral-700">
              Logga in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
