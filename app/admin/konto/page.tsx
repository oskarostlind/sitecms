import { requireUser } from "@/lib/guard";
import { changePasswordAction } from "@/lib/actions/account";

const ROLE_LABELS: Record<"admin" | "customer", string> = {
  admin: "Administratör",
  customer: "Kund",
};

const ERROR_MESSAGES: Record<string, string> = {
  missing: "Fyll i alla fält.",
  short: "Det nya lösenordet måste vara minst 10 tecken.",
  mismatch: "De nya lösenorden stämmer inte överens.",
  "wrong-current": "Nuvarande lösenord är felaktigt.",
  unknown: "Kunde inte hitta ditt konto. Försök logga in igen.",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
  const user = await requireUser();

  const errorMessage = error
    ? (ERROR_MESSAGES[error] ?? "Något gick fel. Försök igen.")
    : null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
          Mitt konto
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Din kontoinformation och lösenord.
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-sm font-medium text-neutral-900">Kontoinformation</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">Namn</dt>
            <dd className="text-neutral-900">{user.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">E-post</dt>
            <dd className="text-neutral-900">{user.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">Roll</dt>
            <dd className="text-neutral-900">{ROLE_LABELS[user.role]}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-sm font-medium text-neutral-900">Byt lösenord</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Ange ditt nuvarande lösenord och ditt nya lösenord (minst 10 tecken).
        </p>

        <form action={changePasswordAction} className="mt-4 space-y-3">
          <div>
            <label
              htmlFor="currentPassword"
              className="block text-sm font-medium text-neutral-700"
            >
              Nuvarande lösenord
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-neutral-700"
            >
              Nytt lösenord
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-neutral-700"
            >
              Upprepa nytt lösenord
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
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

          {success ? (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              Lösenordet har uppdaterats.
            </p>
          ) : null}

          <button
            type="submit"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Spara nytt lösenord
          </button>
        </form>
      </div>
    </div>
  );
}
