import type { Metadata } from "next";
import { peekToken } from "@/lib/tokens";
import { verifyEmailAction, resendVerificationAction } from "@/lib/actions/auth";
import { AuthLink, AuthShell } from "@/components/auth/AuthShell";
import { Alert, Field, Input, SubmitButton } from "@/components/ui";

export const metadata: Metadata = {
  title: "Bekräfta e-post — sitecms",
};

/**
 * /verify?token=… — länken i bekräftelsemejlet.
 *
 * Token förbrukas inte vid GET: e-postklienters länkskannrar öppnar ofta
 * länkar i förväg, och då skulle länken vara "använd" när personen själv
 * klickar. Sidan visar i stället en knapp som postar till verifyEmailAction.
 */
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string; resent?: string }>;
}) {
  const { token, error, resent } = await searchParams;
  const row = token && !error ? await peekToken(token, "verify") : null;

  if (resent === "1") {
    return (
      <AuthShell title="Kolla din mejl" footer={<AuthLink href="/login">Till inloggningen</AuthLink>}>
        <Alert tone="success">
          Om adressen har ett konto som väntar på bekräftelse har vi skickat en ny länk. Den gäller i 7 dagar.
        </Alert>
      </AuthShell>
    );
  }

  if (!row) {
    return (
      <AuthShell
        title="Länken fungerar inte"
        description="Bekräftelselänken är ogiltig, har redan använts eller har gått ut."
        footer={
          <p className="text-neutral-600">
            Redan bekräftad? <AuthLink href="/login">Logga in</AuthLink>
          </p>
        }
      >
        <div className="space-y-4">
          <Alert tone="warning">
            Har du redan klickat på länken en gång kan du logga in direkt. Annars kan du få en ny länk nedan.
          </Alert>
          <form action={resendVerificationAction} className="space-y-4">
            <input type="hidden" name="returnTo" value="verify" />
            <Field htmlFor="email" label="E-post">
              <Input id="email" name="email" type="email" autoComplete="email" required placeholder="namn@exempel.se" />
            </Field>
            <SubmitButton className="w-full" pendingText="Skickar…">
              Skicka ny bekräftelse
            </SubmitButton>
          </form>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Bekräfta din e-postadress"
      description={
        <>
          Bekräfta att <strong className="font-medium text-neutral-700">{row.email}</strong> är din adress, sedan kan
          du logga in.
        </>
      }
    >
      <form action={verifyEmailAction}>
        <input type="hidden" name="token" value={token} />
        <SubmitButton size="lg" className="w-full" pendingText="Bekräftar…">
          Bekräfta e-postadressen
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
