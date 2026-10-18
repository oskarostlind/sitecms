import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import { forgotPasswordAction } from "@/lib/actions/auth";
import { AuthLink, AuthShell } from "@/components/auth/AuthShell";
import { Alert, Field, Input, SubmitButton } from "@/components/ui";

export const metadata: Metadata = {
  title: "Glömt lösenord — sitecms",
};

const ERROR_MESSAGES: Record<string, string> = {
  "invalid-email": "Ange en giltig e-postadress.",
};

export default async function ForgotPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string; email?: string }>;
}) {
  const { error, sent, email } = await searchParams;

  if (sent === "1") {
    return (
      <AuthShell
        title="Kolla din mejl"
        footer={
          <p>
            <AuthLink href="/login">Tillbaka till inloggningen</AuthLink>
          </p>
        }
      >
        <div className="space-y-4">
          <Alert tone="success" icon={<MailCheck />}>
            Om det finns ett konto för <strong className="font-semibold">{email || "adressen"}</strong> har vi skickat
            en länk där du kan välja ett nytt lösenord. Länken gäller i 2 timmar.
          </Alert>
          <p className="text-sm text-neutral-600">
            Inget mejl inom några minuter? Titta i skräpposten eller{" "}
            <AuthLink href={email ? `/forgot?email=${encodeURIComponent(email)}` : "/forgot"}>försök igen</AuthLink>.
          </p>
        </div>
      </AuthShell>
    );
  }

  const errorMessage = error ? (ERROR_MESSAGES[error] ?? "Något gick fel. Försök igen.") : null;

  return (
    <AuthShell
      title="Glömt lösenord?"
      description="Ange din e-postadress så skickar vi en länk där du kan välja ett nytt lösenord."
      footer={
        <p className="text-neutral-600">
          Kom du på det? <AuthLink href="/login">Logga in</AuthLink>
        </p>
      }
    >
      <form action={forgotPasswordAction} className="space-y-4">
        <Field htmlFor="email" label="E-post">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={email ?? ""}
            placeholder="namn@exempel.se"
          />
        </Field>

        {errorMessage ? <Alert tone="danger">{errorMessage}</Alert> : null}

        <SubmitButton size="lg" className="w-full" pendingText="Skickar…">
          Skicka länk
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
