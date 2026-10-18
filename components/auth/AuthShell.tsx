import Link from "next/link";
import { PenLine, Newspaper, ShieldCheck } from "lucide-react";
import { loginWithGoogleAction } from "@/lib/auth-actions";
import { Button } from "@/components/ui";

/**
 * Gemensam ram för de publika kontosidorna (/login, /signup, /verify,
 * /forgot, /reset, /invite): mörk brand-panel till vänster från lg och
 * formulärkolumn till höger. Server-komponent — sidorna fungerar utan JS.
 */

const BRAND_POINTS = [
  { icon: PenLine, text: "Ändra texter och bilder direkt" },
  { icon: Newspaper, text: "Publicera nyheter" },
  { icon: ShieldCheck, text: "Tryggt – du kan alltid ångra" },
];

/** Inline vit variant av loggan – Logo-komponenten stödjer bara mörk text på ljus botten. */
function LogoOnDark() {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={28} height={28} viewBox="0 0 32 32" aria-hidden className="shrink-0">
        <rect width="32" height="32" rx="8" className="fill-white" />
        <text
          x="16"
          y="22.5"
          textAnchor="middle"
          fill="#121f47"
          fontFamily="Inter Variable, ui-sans-serif, system-ui, sans-serif"
          fontSize="22"
          fontWeight="700"
        >
          s
        </text>
      </svg>
      <span className="text-lg font-semibold tracking-tight text-white">sitecms</span>
    </span>
  );
}

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
    <main className="flex min-h-screen">
      {/* Brand-panel – döljs under lg, tar 40% av bredden från lg och uppåt. */}
      <div className="hidden lg:flex lg:w-[40%] lg:flex-col lg:justify-between bg-brand-950 p-10 text-white xl:p-14">
        <Link href="/" className="w-fit rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
          <LogoOnDark />
        </Link>

        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-white">{brandHeading}</h2>
          <ul className="mt-8 space-y-5">
            {BRAND_POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-300" />
                <span className="text-sm text-brand-100">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div aria-hidden className="text-xs text-brand-300">
          © {new Date().getFullYear()} sitecms
        </div>
      </div>

      {/* Formulärkolumn */}
      <div className="flex flex-1 flex-col items-center justify-center bg-neutral-50 p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center lg:hidden">
            <Link href="/" aria-label="sitecms – till startsidan">
              <svg width={32} height={32} viewBox="0 0 32 32" aria-hidden className="shrink-0">
                <rect width="32" height="32" rx="8" className="fill-brand-600" />
                <text
                  x="16"
                  y="22.5"
                  textAnchor="middle"
                  fill="#fff"
                  fontFamily="Inter Variable, ui-sans-serif, system-ui, sans-serif"
                  fontSize="22"
                  fontWeight="700"
                >
                  s
                </text>
              </svg>
            </Link>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{title}</h1>
          {description ? <p className="mt-2 text-sm text-neutral-500">{description}</p> : null}

          <div className="mt-6">{children}</div>

          {footer ? <div className="mt-8 space-y-2 text-center text-sm">{footer}</div> : null}
        </div>
      </div>
    </main>
  );
}

/** Textlänk i samma stil som på /login. */
export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-brand-600 underline-offset-2 hover:text-brand-700 hover:underline">
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
        <span className="text-xs uppercase tracking-wide text-neutral-400">eller</span>
        <div className="h-px flex-1 bg-neutral-200" />
      </div>

      <form action={loginWithGoogleAction}>
        {callbackUrl ? <input type="hidden" name="callbackUrl" value={callbackUrl} /> : null}
        <Button type="submit" variant="secondary" size="lg" className="w-full">
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
