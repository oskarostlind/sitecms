import type { Metadata } from "next";
import { NOINDEX } from "@/lib/seo";
import { peekToken } from "@/lib/tokens";
import { resetPasswordWithTokenAction } from "@/lib/actions/auth";
import { AuthLink, AuthShell } from "@/components/auth/AuthShell";
import { Alert, ButtonLink, Field, Input, SubmitButton } from "@/components/ui";

export const metadata: Metadata = {
  title: "Välj nytt lösenord",
  robots: NOINDEX,
};

const ERROR_MESSAGES: Record<string, string> = {
  missing: "Fyll i lösenordet två gånger.",
  short: "Lösenordet måste vara minst 10 tecken.",
  mismatch: "Lösenorden stämmer inte överens.",
};

/** /reset?token=… — länken i "Välj ett nytt lösenord"-mejlet. */
export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const row = token && error !== "invalid" ? await peekToken(token, "reset") : null;

  if (!row) {
    return (
      <AuthShell
        title="Länken fungerar inte"
        description="Länken för att välja nytt lösenord är ogiltig, har redan använts eller har gått ut (den gäller i 2 timmar)."
        footer={
          <p>
            <AuthLink href="/login">Tillbaka till inloggningen</AuthLink>
          </p>
        }
      >
        <ButtonLink href="/forgot" size="lg" className="w-full">
          Skicka en ny länk
        </ButtonLink>
      </AuthShell>
    );
  }

  const errorMessage = error ? (ERROR_MESSAGES[error] ?? "Något gick fel. Försök igen.") : null;

  return (
    <AuthShell
      title="Välj ett nytt lösenord"
      description={
        <>
          För kontot <strong className="font-medium text-neutral-700">{row.email}</strong>.
        </>
      }
    >
      <form action={resetPasswordWithTokenAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        {/* Hjälper lösenordshanterare att spara rätt användarnamn. */}
        <input type="email" name="username" autoComplete="username" value={row.email} readOnly hidden />

        <Field htmlFor="password" label="Nytt lösenord" hint="Minst 10 tecken.">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
            aria-describedby="password-hint"
          />
        </Field>

        <Field htmlFor="confirmPassword" label="Upprepa lösenordet">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
          />
        </Field>

        {errorMessage ? <Alert tone="danger">{errorMessage}</Alert> : null}

        <SubmitButton size="lg" className="w-full" pendingText="Sparar…">
          Spara och logga in
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
