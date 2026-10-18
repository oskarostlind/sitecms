import type { Metadata } from "next";
import { NOINDEX } from "@/lib/seo";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sites, users } from "@/lib/db/schema";
import { auth, googleAuthEnabled } from "@/lib/auth";
import { peekToken } from "@/lib/tokens";
import {
  acceptInviteAction,
  acceptInviteWithPasswordAction,
  switchAccountForInviteAction,
} from "@/lib/actions/members";
import { MEMBERSHIP_ROLE_LABELS } from "@/lib/emails";
import { AuthLink, AuthShell, authInputClassName } from "@/components/auth/AuthShell";
import { Alert, Badge, ButtonLink, Field, Input, SubmitButton } from "@/components/ui";

export const metadata: Metadata = {
  title: "Inbjudan",
  robots: NOINDEX,
};

const ERROR_MESSAGES: Record<string, string> = {
  missing: "Fyll i namn och lösenord.",
  "name-long": "Namnet får vara högst 120 tecken.",
  short: "Lösenordet måste vara minst 10 tecken.",
};

/**
 * /invite?token=… — länken i inbjudningsmejlet.
 *
 * - Konto utan lösenord (nyinbjuden) och inte inloggad: välj namn + lösenord → Acceptera.
 * - Konto med lösenord, inte inloggad: "Logga in för att acceptera" (tillbaka hit efteråt).
 * - Inloggad som rätt konto: knappen Acceptera.
 * - Inloggad som fel konto: meddelande + logga ut och byt konto.
 */
export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const invite = token && error !== "invalid" ? await peekToken(token, "invite") : null;

  const [site] = invite?.siteId
    ? await db.select({ id: sites.id, name: sites.name }).from(sites).where(eq(sites.id, invite.siteId)).limit(1)
    : [];
  const [invitedUser] = invite
    ? await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          passwordHash: users.passwordHash,
          emailVerifiedAt: users.emailVerifiedAt,
        })
        .from(users)
        .where(eq(users.id, invite.userId))
        .limit(1)
    : [];

  if (!invite || !token || !site || !invitedUser) {
    return (
      <AuthShell
        title="Inbjudan fungerar inte"
        description="Länken är ogiltig, har redan använts, har återkallats eller har gått ut (inbjudningar gäller i 7 dagar)."
        footer={
          <p className="text-neutral-600">
            Har du redan accepterat? <AuthLink href="/login">Logga in</AuthLink>
          </p>
        }
      >
        <Alert tone="warning">Be den som bjöd in dig att skicka en ny inbjudan.</Alert>
      </AuthShell>
    );
  }

  const [inviter] = invite.invitedByUserId
    ? await db.select({ name: users.name }).from(users).where(eq(users.id, invite.invitedByUserId)).limit(1)
    : [];
  const inviterName = inviter?.name || "Sajtens ägare";
  const role = invite.membershipRole ?? "editor";
  const errorMessage = error && error !== "wrong-account" ? (ERROR_MESSAGES[error] ?? "Något gick fel. Försök igen.") : null;
  const invitePath = `/invite?token=${encodeURIComponent(token)}`;

  const session = await auth();
  const sessionUserId = session?.user?.id ?? null;
  const isRightAccount = sessionUserId === invitedUser.id;
  const isWrongAccount = Boolean(sessionUserId) && !isRightAccount;

  const summary = (
    <div className="mb-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm">
      <p className="text-neutral-600">
        <span className="font-medium text-neutral-900">{inviterName}</span> har bjudit in{" "}
        <span className="font-medium text-neutral-900">{invite.email}</span> till
      </p>
      <p className="mt-1 text-base font-semibold text-neutral-900">{site.name}</p>
      <p className="mt-2 flex items-center gap-2 text-neutral-600">
        Roll: <Badge tone={role === "owner" ? "brand" : "neutral"}>{MEMBERSHIP_ROLE_LABELS[role]}</Badge>
      </p>
    </div>
  );

  if (isWrongAccount) {
    return (
      <AuthShell title={`Inbjudan till ${site.name}`}>
        {summary}
        <div className="space-y-4">
          <Alert tone="warning" title="Du är inloggad med ett annat konto">
            Du är inloggad som <strong className="font-semibold">{session?.user?.email}</strong>, men inbjudan
            gäller <strong className="font-semibold">{invite.email}</strong>. Logga ut och logga in med rätt konto
            för att acceptera.
          </Alert>
          <form action={switchAccountForInviteAction}>
            <input type="hidden" name="token" value={token} />
            <SubmitButton variant="secondary" className="w-full rounded-full!" pendingText="Loggar ut…">
              Logga ut och byt konto
            </SubmitButton>
          </form>
        </div>
      </AuthShell>
    );
  }

  if (isRightAccount) {
    return (
      <AuthShell title={`Inbjudan till ${site.name}`} description="Acceptera för att få åtkomst till sajten.">
        {summary}
        <form action={acceptInviteAction}>
          <input type="hidden" name="token" value={token} />
          <SubmitButton size="lg" className="w-full rounded-full!" pendingText="Accepterar…">
            Acceptera
          </SubmitButton>
        </form>
      </AuthShell>
    );
  }

  // Bekräftat konto med lösenord → logga in. Saknas lösenord (nyinbjuden)
  // eller är kontot obekräftat → välj namn + lösenord direkt här.
  if (invitedUser.passwordHash && invitedUser.emailVerifiedAt) {
    return (
      <AuthShell
        title={`Inbjudan till ${site.name}`}
        description="Du har redan ett konto. Logga in för att acceptera inbjudan."
        footer={
          <p className="text-neutral-600">
            Glömt lösenordet? <AuthLink href="/forgot">Välj ett nytt</AuthLink>
          </p>
        }
      >
        {summary}
        <ButtonLink
          href={`/login?callbackUrl=${encodeURIComponent(invitePath)}&email=${encodeURIComponent(invite.email)}`}
          size="lg"
          className="w-full rounded-full!"
        >
          Logga in för att acceptera
        </ButtonLink>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={`Inbjudan till ${site.name}`}
      description="Välj namn och lösenord för ditt konto, så kommer du direkt till sajten."
      footer={
        googleAuthEnabled ? (
          <p className="text-neutral-600">
            Vill du hellre använda Google?{" "}
            <AuthLink href={`/login?callbackUrl=${encodeURIComponent(invitePath)}`}>Logga in med Google</AuthLink>
          </p>
        ) : undefined
      }
    >
      {summary}
      <form action={acceptInviteWithPasswordAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <input type="email" name="username" autoComplete="username" value={invite.email} readOnly hidden />

        <Field htmlFor="name" label="Namn">
          <Input
            className={authInputClassName}
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            maxLength={120}
            defaultValue={invitedUser.name}
          />
        </Field>

        <Field htmlFor="password" label="Lösenord" hint="Minst 10 tecken.">
          <Input
            className={authInputClassName}
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

        <SubmitButton size="lg" className="w-full rounded-full!" pendingText="Accepterar…">
          Acceptera
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
