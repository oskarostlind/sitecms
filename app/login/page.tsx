import Link from "next/link";
import { loginAction, loginWithGoogleAction } from "@/lib/auth-actions";
import { googleAuthEnabled } from "@/lib/auth";

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "Fel e-post eller lösenord.",
  missing: "Fyll i e-post och lösenord.",
  AccessDenied: "Kontot finns inte — kontakta din administratör.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = error
    ? (ERROR_MESSAGES[error] ?? "Något gick fel vid inloggningen. Försök igen.")
    : null;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Logga in</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Logga in med din e-post och ditt lösenord för att komma åt
          adminpanelen.
        </p>

        <form action={loginAction} className="mt-6 space-y-3">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-neutral-700"
            >
              E-post
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="namn@exempel.se"
              className="h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-400 focus:bg-white"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-neutral-700"
            >
              Lösenord
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-400 focus:bg-white"
            />
          </div>

          {errorMessage ? (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600"
            >
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            className="h-10 w-full rounded-lg bg-neutral-900/90 text-sm font-medium text-white transition hover:bg-neutral-900"
          >
            Logga in
          </button>
        </form>

        {googleAuthEnabled ? (
          <>
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-neutral-200" />
              <span className="text-xs uppercase tracking-wide text-neutral-400">
                eller
              </span>
              <div className="h-px flex-1 bg-neutral-200" />
            </div>

            <form action={loginWithGoogleAction}>
              <button
                type="submit"
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  aria-hidden="true"
                >
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
                Logga in med Google
              </button>
            </form>
          </>
        ) : null}

        <p className="mt-6 text-center text-xs text-neutral-400">
          <Link href="/" className="hover:text-neutral-600">
            Tillbaka till startsidan
          </Link>
        </p>
      </div>
    </main>
  );
}
