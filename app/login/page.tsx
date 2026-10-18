import { loginAction } from "@/lib/auth-actions";
import { resendVerificationAction } from "@/lib/actions/auth";
import { googleAuthEnabled } from "@/lib/auth";
import { safeCallbackPath } from "@/lib/account-flows";
import { AuthLink, AuthShell, GoogleSignInButton } from "@/components/auth/AuthShell";
import { Alert, Field, Input, SubmitButton } from "@/components/ui";

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "Fel e-post eller lösenord.",
  missing: "Fyll i e-post och lösenord.",
  AccessDenied: "Inloggningen nekades. Försök igen eller logga in med e-post och lösenord.",
  OAuthAccountNotLinked: "Kontot kunde inte kopplas. Logga in med e-post och lösenord.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    callbackUrl?: string;
    email?: string;
    verified?: string;
    reset?: string;
    resent?: string;
    resendError?: string;
  }>;
}) {
  const { error, callbackUrl: rawCallback, email, verified, reset, resent, resendError } = await searchParams;
  const callbackUrl = safeCallbackPath(rawCallback);
  const hasCustomCallback = callbackUrl !== "/admin";
  const isInviteCallback = callbackUrl.startsWith("/invite");

  const isUnverified = error === "unverified";
  const errorMessage =
    error && !isUnverified ? (ERROR_MESSAGES[error] ?? "Något gick fel vid inloggningen. Försök igen.") : null;

  const signupHref = hasCustomCallback ? `/signup?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/signup";

  return (
    <AuthShell
      title="Logga in"
      description={
        isInviteCallback
          ? "Logga in med kontot inbjudan skickades till för att acceptera den."
          : "Välkommen tillbaka. Logga in för att redigera din sajt."
      }
      footer={
        <>
          <p className="text-neutral-600">
            Har du inget konto? <AuthLink href={signupHref}>Skapa konto</AuthLink>
          </p>
          <p>
            <AuthLink href="/">Tillbaka till startsidan</AuthLink>
          </p>
        </>
      }
    >
      <div className="space-y-4">
        {verified === "1" ? (
          <Alert tone="success" title="E-posten är bekräftad">
            Logga in för att komma igång.
          </Alert>
        ) : null}
        {reset === "1" ? <Alert tone="success">Ditt nya lösenord är sparat. Logga in med det.</Alert> : null}
        {resent === "1" ? (
          <Alert tone="success" title="Kolla din mejl">
            Om kontot väntar på bekräftelse har vi skickat en ny länk{email ? ` till ${email}` : ""}.
          </Alert>
        ) : null}

        {isUnverified ? (
          <Alert
            tone="warning"
            title="Bekräfta din e-postadress först"
            actions={
              <form action={resendVerificationAction}>
                <input type="hidden" name="email" value={email ?? ""} />
                <input type="hidden" name="returnTo" value="login" />
                <SubmitButton size="sm" variant="secondary" pendingText="Skickar…">
                  Skicka ny bekräftelse
                </SubmitButton>
              </form>
            }
          >
            Vi skickade en länk när du skapade kontot. Klicka på den och logga sedan in igen.
            {resendError ? " Ange din e-postadress i formuläret och försök igen." : null}
          </Alert>
        ) : null}
      </div>

      <form action={loginAction} className="mt-4 space-y-4">
        {hasCustomCallback ? <input type="hidden" name="callbackUrl" value={callbackUrl} /> : null}
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

        <Field htmlFor="password" label="Lösenord">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />
        </Field>

        <div className="-mt-1 text-right text-sm">
          <AuthLink href="/forgot">Glömt lösenord?</AuthLink>
        </div>

        {errorMessage ? <Alert tone="danger">{errorMessage}</Alert> : null}

        <SubmitButton size="lg" className="w-full" pendingText="Loggar in…">
          Logga in
        </SubmitButton>
      </form>

      {googleAuthEnabled ? (
        <GoogleSignInButton callbackUrl={hasCustomCallback ? callbackUrl : undefined} />
      ) : null}
    </AuthShell>
  );
}
