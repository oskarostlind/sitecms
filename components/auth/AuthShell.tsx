import Image from "next/image";
import Link from "next/link";
import { PenLine, Newspaper, ShieldCheck } from "lucide-react";
import { loginWithGoogleAction } from "@/lib/auth-actions";
import { Button, Logo } from "@/components/ui";
import { SpaceBackdrop } from "@/components/brand/SpaceBackdrop";

/**
 * Gemensam ram för de publika kontosidorna (/login, /signup, /verify,
 * /forgot, /reset, /invite) enligt docs/BRAND.md — mörk ram, ljus läsyta:
 * landningens rymd (stjärnor + planet) i panelen till vänster från lg, en
 * kompakt mörk topp under lg, och formuläret på vit yta. Server-komponent —
 * sidorna fungerar utan JS.
 */

const BRAND_POINTS = [
  { icon: PenLine, text: "Ändra texter och bilder direkt" },
  { icon: Newspaper, text: "Publicera nyheter" },
  { icon: ShieldCheck, text: "Tryggt – du kan alltid ångra" },
];

/**
 * Lokala överstyrningar för `Input` på kontosidorna: tydligare kant och en
 * fokusmarkering med AA-kontrast mot vitt (components/ui delas med panelen
 * och ändras inte härifrån). `!` eftersom `cn` inte slår ihop konflikter.
 */
export const authInputClassName =
  "border-neutral-400! hover:border-neutral-500! focus:border-brand-600! focus:ring-brand-500/40!";

/** Knappar på publika sidor är runda som på landningen (BRAND.md). */
export const authButtonClassName = "rounded-full!";

const logoLinkFocus =
  "rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/70 " +
  "focus-visible:ring-offset-4 focus-visible:ring-offset-space-950";

export function AuthShell({
  title,
  description,
  children,
  footer,
  brandHeading = "Din hemsida, dina ändringar.",
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  /** Länkar under formuläret ("Har du inget konto?" osv.). */
  footer?: React.ReactNode;
  brandHeading?: string;
}) {
  return (
    <main className="flex min-h-screen flex-col bg-white lg:flex-row">
      {/* Under lg: kompakt mörk topp med loggan och en liten planet i kanten. */}
      <div className="relative isolate overflow-hidden border-b border-white/10 lg:hidden">
        <SpaceBackdrop />
        <Image
          src="/planet/planet-still-480.webp"
          alt=""
          aria-hidden
          width={480}
          height={480}
          sizes="112px"
          className="pointer-events-none absolute -right-7 top-1/2 size-28 -translate-y-1/2 opacity-90 [mask-image:radial-gradient(circle_at_center,black_55%,transparent_72%)] sm:right-6"
        />
        <div className="relative flex h-[72px] items-center px-4 sm:px-10">
          <Link href="/" aria-label="sitecms – till startsidan" className={logoLinkFocus}>
            <Logo tone="dark" size={28} />
          </Link>
        </div>
      </div>

      {/* Från lg: rymdpanel med planeten, 42 % av bredden. */}
      <div className="relative isolate hidden overflow-hidden text-ink lg:flex lg:w-[42%] lg:flex-col lg:justify-between lg:p-10 xl:p-14">
        <SpaceBackdrop planet="corner" />

        <Link href="/" className={`relative w-fit ${logoLinkFocus}`}>
          <Logo tone="dark" size={30} />
        </Link>

        <div className="relative max-w-md [text-shadow:0_1px_24px_rgba(0,0,0,0.6)]">
          <h2 className="text-4xl font-extrabold leading-[1.05] tracking-[-0.02em] text-ink xl:text-[44px]">
            {brandHeading}
          </h2>
          <ul className="mt-9 space-y-4">
            {BRAND_POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3.5">
                <span
                  aria-hidden
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur"
                >
                  <Icon className="size-[18px] text-brand-400" />
                </span>
                <span className="text-[15px] text-ink-muted">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div
          aria-hidden
          className="relative w-fit rounded-full border border-white/10 bg-space-950/60 px-3 py-1 text-xs text-ink-muted backdrop-blur"
        >
          © {new Date().getFullYear()} sitecms
        </div>
      </div>

      {/* Formulärkolumn – ljus läsyta. */}
      <div className="flex flex-1 flex-col items-center px-4 py-10 sm:px-10 sm:py-14 lg:justify-center">
        <div className="w-full max-w-sm animate-slide-up-fade">
          <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-space-950 sm:text-3xl">
            {title}
          </h1>
          {description ? <p className="mt-2 text-sm leading-relaxed text-neutral-600">{description}</p> : null}

          <div className="mt-7">{children}</div>

          {footer ? (
            <div className="mt-8 space-y-2 border-t border-neutral-200 pt-6 text-center text-sm">{footer}</div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

/** Textlänk på ljus yta: brand-700 (AA mot vitt) med diskret understrykning. */
export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-sm font-medium text-brand-700 underline decoration-brand-700/30 underline-offset-[3px] transition-colors hover:text-brand-800 hover:decoration-brand-800"
    >
      {children}
    </Link>
  );
}

/** "eller"-avdelare + "Logga in med Google". Rendera bara när googleAuthEnabled. */
export function GoogleSignInButton({ label = "Logga in med Google", callbackUrl }: { label?: string; callbackUrl?: string }) {
  return (
    <>
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-neutral-200" />
        <span className="text-xs uppercase tracking-wide text-neutral-500">eller</span>
        <div className="h-px flex-1 bg-neutral-200" />
      </div>

      <form action={loginWithGoogleAction}>
        {callbackUrl ? <input type="hidden" name="callbackUrl" value={callbackUrl} /> : null}
        <Button type="submit" variant="secondary" size="lg" className={`w-full ${authButtonClassName}`}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.09-1.8 2.73v2.27h2.91c1.7-1.57 2.69-3.87 2.69-6.64z"
              fill="#4285F4"
            />
            <path
              d="M9 18c2.43 0 4.47-.8 5.96-2.17l-2.91-2.27c-.81.54-1.85.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.34C2.44 15.98 5.48 18 9 18z"
              fill="#34A853"
            />
            <path
              d="M3.96 10.71A5.41 5.41 0 013.68 9c0-.59.1-1.17.28-1.71V4.95H.96A9 9 0 000 9c0 1.45.35 2.83.96 4.05l3-2.34z"
              fill="#FBBC05"
            />
            <path
              d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.95l3 2.34C4.67 5.16 6.66 3.58 9 3.58z"
              fill="#EA4335"
            />
          </svg>
          {label}
        </Button>
      </form>
    </>
  );
}
