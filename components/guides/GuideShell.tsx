import Link from "next/link";
import { ButtonLink, Logo } from "@/components/ui";

/** Header + footer för guiderna. Server-renderad: alla länkar syns för crawlern. */
export function GuideShell({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear();
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 text-neutral-900">
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/85 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" aria-label="sitecms startsida" className="shrink-0 rounded-md">
              <Logo />
            </Link>
            <span aria-hidden className="hidden h-5 w-px bg-neutral-200 sm:block" />
            <nav aria-label="Huvudmeny" className="hidden items-center gap-4 text-sm font-medium text-neutral-600 sm:flex">
              <Link href="/guider" className="hover:text-neutral-900">
                Guider
              </Link>
              <Link href="/docs" className="hover:text-neutral-900">
                Dokumentation
              </Link>
            </nav>
          </div>
          <nav aria-label="Konto" className="flex items-center gap-2">
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

      <footer className="mt-auto border-t border-neutral-200 bg-white px-4 py-10 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-8 text-sm sm:grid-cols-4">
          <div className="space-y-2 sm:col-span-1">
            <Logo />
            <p className="text-neutral-500">Innehållshantering för småföretag och deras utvecklare.</p>
          </div>
          <FooterCol
            title="Guider"
            links={[
              { href: "/guider#smaforetag", label: "För småföretag" },
              { href: "/guider#utvecklare", label: "För utvecklare" },
              { href: "/guider/andra-text-pa-hemsidan", label: "Ändra text på hemsidan" },
              { href: "/guider/byta-bild-pa-hemsidan", label: "Byta bild på hemsidan" },
            ]}
          />
          <FooterCol
            title="Produkt"
            links={[
              { href: "/", label: "Startsida" },
              { href: "/docs", label: "Dokumentation" },
              { href: "/signup", label: "Skapa konto" },
              { href: "/login", label: "Logga in" },
            ]}
          />
          <FooterCol
            title="Övrigt"
            links={[
              { href: "/integritet", label: "Integritet" },
              { href: "mailto:info@oskarostlind.se", label: "Kontakt" },
            ]}
          />
        </div>
        <p className="mx-auto mt-8 max-w-6xl text-xs text-neutral-400">&copy; {year} sitecms</p>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">{title}</p>
      <ul className="space-y-1.5">
        {links.map((l) => (
          <li key={l.href}>
            {l.href.startsWith("/") ? (
              <Link href={l.href} className="text-neutral-700 hover:text-neutral-900">
                {l.label}
              </Link>
            ) : (
              <a href={l.href} className="text-neutral-700 hover:text-neutral-900">
                {l.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
