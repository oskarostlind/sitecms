import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MailCheck } from "lucide-react";
import { auth, googleAuthEnabled } from "@/lib/auth";
import { signupAction, resendVerificationAction } from "@/lib/actions/auth";
import { safeCallbackPath } from "@/lib/account-flows";
import { AuthLink, AuthShell, GoogleSignInButton } from "@/components/auth/AuthShell";
import { Alert, Field, Input, SubmitButton } from "@/components/ui";

export const metadata: Metadata = {
  title: "Skapa konto — sitecms",
};

const ERROR_MESSAGES: Record<string, string> = {
  missing: "Fyll i namn, e-post och lösenord.",
  "name-long": "Namnet får vara högst 120 tecken.",
  "invalid-email": "Ange en giltig e-postadress.",
  short: "Lösenordet måste vara minst 10 tecken.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    sent?: string;
    resent?: string;
    name?: string;
    email?: string;
    callbackUrl?: string;
  }>;
}) {
  const { error, sent, resent, name, email, callbackUrl: rawCallback } = await searchParams;
  const callbackUrl = safeCallbackPath(rawCallback);

  // Redan inloggad → inget konto att skapa.
  const session = await auth();
  if (session?.user?.id && sent !== "1") {
    redirect(callbackUrl);
  }

  if (sent === "1") {
    return (
      <AuthShell
        title="Kolla din mejl"
        description="Ett steg kvar innan du kan logga in."
        footer={
          <p>
            <AuthLink href="/login">Till inloggningen</AuthLink>
          </p>
        }
      >
        <div className="space-y-4">
          <Alert tone="success" icon={<MailCheck />} title={resent ? "Ny länk skickad" : "Bekräftelselänk skickad"}>
            Vi har skickat en länk till <strong className="font-semibold">{email || "din e-postadress"}</strong>.
            Klicka på den för att bekräfta adressen. Länken gäller i 7 dagar.
          </Alert>
          <p className="text-sm text-neutral-600">
            Hittar du inget mejl? Titta i skräpposten, eller skicka en ny länk.
          </p>
          <form action={resendVerificationAction}>
            <input type="hidden" name="email" value={email ?? ""} />
            <input type="hidden" name="returnTo" value="signup" />
            <SubmitButton variant="secondary" className="w-full" pendingText="Skickar…">
              Skicka ny bekräftelse
            </SubmitButton>
          </form>
        </div>
      </AuthShell>
    );
  }

  const errorMessage = error ? (ERROR_MESSAGES[error] ?? "Något gick fel. Försök igen.") : null;
  const loginHref = callbackUrl !== "/admin" ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login";

  return (
    <AuthShell
      title="Skapa konto"
      description="Gratis att komma igång. Koppla din första sajt direkt efter att du bekräftat e-posten."
      brandHeading="Koppla en sajt på tio minuter."
      footer={
        <>
          <p className="text-neutral-600">
            Har du redan ett konto? <AuthLink href={loginHref}>Logga in</AuthLink>
          </p>
          <p>
            <AuthLink href="/">Tillbaka till startsidan</AuthLink>
          </p>
        </>
      }
    >
      <form action={signupAction} className="space-y-4">
        <Field htmlFor="name" label="Namn">
          <Input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            maxLength={120}
            defaultValue={name ?? ""}
            placeholder="Förnamn Efternamn"
          />
        </Field>

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

        <Field htmlFor="password" label="Lösenord" hint="Minst 10 tecken.">
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

        {errorMessage ? <Alert tone="danger">{errorMessage}</Alert> : null}

        <SubmitButton size="lg" className="w-full" pendingText="Skapar konto…">
          Skapa konto
        </SubmitButton>
      </form>

      {googleAuthEnabled ? (
        <GoogleSignInButton
          label="Fortsätt med Google"
          callbackUrl={callbackUrl !== "/admin" ? callbackUrl : undefined}
        />
      ) : null}
    </AuthShell>
  );
}
