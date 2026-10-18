import Link from "next/link";
import { Logo } from "@/components/ui";
import { SpaceBackdrop } from "@/components/brand/SpaceBackdrop";
import { cn } from "@/lib/cn";

/* ---------------------------------------------------------------------------
   Delade byggstenar för de publika läsytorna (guider, docs, integritet):
   mörk ram (header, hero, footer) och ljus läsyta däremellan — docs/BRAND.md.
   Allt är serverkomponenter; inget innehåll gömmer sig bakom JS.
--------------------------------------------------------------------------- */

/**
 * Pillerknappar som landningens `.btn` — rounded-full, mint med mörk text
 * eller glas-outline på mörk yta. Egna klasser i stället för `buttonClassName`
 * eftersom `cn` inte slår ihop motstridiga Tailwind-klasser (rounded-lg/-full).
 */
export function pillClassName({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: "primary" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
} = {}) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold",
    "transition-[background-color,border-color,transform,box-shadow] duration-200 motion-safe:hover:-translate-y-0.5",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-space-950",
    "[&>svg]:size-4 [&>svg]:shrink-0",
    variant === "primary"
      ? "bg-brand-400 text-brand-950 shadow-[0_10px_30px_-10px_rgba(93,240,168,0.55),inset_0_1px_0_rgba(255,255,255,0.4)] hover:bg-brand-300"
      : "border border-white/15 bg-white/5 text-ink backdrop-blur hover:border-white/25 hover:bg-white/10",
    size === "sm" && "h-9 px-3.5 text-sm sm:px-4",
    size === "md" && "h-10 px-5 text-sm",
    size === "lg" && "h-12 px-6 text-[15px]",
    className,
  );
}

/**
 * Klasser för `CodeBlock` på publika sidor: rymdnavy i stället för neutral
 * svart. `!` behövs eftersom CodeBlock redan sätter bakgrund och kant.
 */
export const spaceCodeBlockClassName =
  "border-space-700! bg-space-900! [&>div:first-child]:border-white/10! [&>div:first-child]:bg-space-800!";

/** Länkfärg i brödtext på ljus yta (AA på vitt). */
export const lightLinkClassName =
  "font-medium text-brand-700 underline decoration-brand-700/40 underline-offset-2 hover:text-brand-800 hover:decoration-brand-800";

/**
 * Mörkt hero-band överst på en läsyta. `planet="corner"` för hubbar,
 * `"none"` för artiklar. Innehållet läggs i en max-w-6xl-container.
 */
export function SpaceHero({
  planet = "none",
  className,
  innerClassName,
  children,
}: {
  planet?: "corner" | "none";
  className?: string;
  innerClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("relative isolate overflow-hidden border-b border-white/10 bg-space-950 text-ink", className)}>
      <SpaceBackdrop planet={planet} className="-z-10" />
      {planet === "corner" ? (
        // Skrim så att ljusa moln på planeten aldrig hamnar under texten.
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-space-950/55 sm:bg-transparent sm:bg-[linear-gradient(90deg,var(--color-space-950)_0%,rgb(4_6_15/0.7)_45%,transparent_75%)]"
        />
      ) : null}
      <div className={cn("relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16", innerClassName)}>{children}</div>
    </div>
  );
}

/** Brödsmulor för mörkt hero-band. Sista posten är aktuell sida. */
export function SpaceBreadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Brödsmulor" className="text-sm text-ink-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className={cn("flex min-w-0 items-center gap-1.5", last && "max-w-full")}>
              {i > 0 ? (
                <span aria-hidden className="text-ink-subtle">
                  /
                </span>
              ) : null}
              {item.href && !last ? (
                <Link href={item.href} className="rounded-sm transition-colors hover:text-ink">
                  {item.label}
                </Link>
              ) : (
                <span className="truncate text-ink" aria-current={last ? "page" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const NAV = [
  { key: "guider", href: "/guider", label: "Guider" },
  { key: "docs", href: "/docs", label: "Dokumentation" },
] as const;

/**
 * Header + footer för guiderna, dokumentationen och integritetssidan.
 * Server-renderad: alla länkar syns för crawlern. På mobil hamnar huvudmenyn
 * på en egen rad under loggan (ren CSS, ingen JS-meny).
 */
export function GuideShell({
  children,
  active,
}: {
  children: React.ReactNode;
  /** Markera aktuell sektion i huvudmenyn. */
  active?: (typeof NAV)[number]["key"];
}) {
  const year = new Date().getFullYear();
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 text-neutral-900">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-space-950/80 text-ink backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 px-4 sm:flex-nowrap sm:px-6">
          <Link
            href="/"
            aria-label="sitecms startsida"
            className="flex h-14 shrink-0 items-center rounded-md sm:h-16"
          >
            <Logo tone="dark" size={26} />
          </Link>
          <nav
            aria-label="Huvudmeny"
            className="order-last -mx-4 flex w-[calc(100%+2rem)] items-center gap-6 border-t border-white/10 px-4 py-2.5 text-sm font-medium sm:order-none sm:mx-0 sm:w-auto sm:border-t-0 sm:px-0 sm:py-0"
          >
            {NAV.map((item) => {
              const current = active === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "rounded-sm transition-colors hover:text-ink",
                    current ? "text-ink" : "text-ink-muted",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <nav aria-label="Konto" className="ml-auto flex h-14 items-center gap-1 sm:h-16 sm:gap-2">
            <Link
              href="/login"
              className="inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-white/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/70"
            >
              Logga in
            </Link>
            <Link href="/signup" className={pillClassName({ size: "sm" })}>
              Skapa konto
            </Link>
          </nav>
        </div>
      </header>

      {children}

      <footer className="relative isolate mt-auto overflow-hidden border-t border-white/10 bg-space-950 px-4 pb-10 pt-14 text-ink sm:px-6">
        <div aria-hidden className="sc-stars pointer-events-none absolute inset-0 -z-10" />
        <div className="mx-auto grid max-w-6xl gap-10 text-sm sm:grid-cols-4 sm:gap-8">
          <div className="space-y-3 sm:col-span-1">
            <Logo tone="dark" size={26} />
            <p className="max-w-xs leading-relaxed text-ink-muted">
              Innehållshantering för småföretag och deras utvecklare.
            </p>
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
        <p className="mx-auto mt-12 max-w-6xl border-t border-white/10 pt-6 text-xs text-ink-subtle">
          &copy; {year} sitecms
        </p>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  const linkClass = "rounded-sm text-ink-muted transition-colors hover:text-ink";
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-ink-subtle">{title}</p>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            {l.href.startsWith("/") ? (
              <Link href={l.href} className={linkClass}>
                {l.label}
              </Link>
            ) : (
              <a href={l.href} className={linkClass}>
                {l.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
