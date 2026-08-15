import Link from "next/link";
import { loginAction } from "@/lib/auth-actions";

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "Fel e-post eller lösenord.",
  missing: "Fyll i e-post och lösenord.",
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

        <p className="mt-6 text-center text-xs text-neutral-400">
          <Link href="/" className="hover:text-neutral-600">
            Tillbaka till startsidan
          </Link>
        </p>
      </div>
    </main>
  );
}
