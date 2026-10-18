import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireUser } from "@/lib/guard";
import { changePasswordAction, closeAccountAction } from "@/lib/actions/account";
import { ConfirmButton } from "@/components/content/ConfirmButton";
import { formatDate } from "@/lib/format";
import {
  Alert,
  Avatar,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
  PageHeader,
  SubmitButton,
} from "@/components/ui";

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
  "confirm-email": "Skriv din e-postadress exakt för att bekräfta att kontot ska avslutas.",
  "last-owner": "Du är ensam ägare till minst en sajt. Lägg till en annan ägare eller ta bort sajten först.",
  "last-admin": "Du är den sista administratören och kan inte avsluta kontot.",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
  const user = await requireUser();
  const [dbUser] = await db
    .select({ emailVerifiedAt: users.emailVerifiedAt, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  const hasPassword = Boolean(dbUser?.passwordHash);
  const emailVerifiedAt = dbUser?.emailVerifiedAt ?? null;

  const errorMessage = error
    ? (ERROR_MESSAGES[error] ?? "Något gick fel. Försök igen.")
    : null;

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Mitt konto" description="Din kontoinformation och lösenord." />

      <Card>
        <CardHeader>
          <CardTitle>Kontoinformation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar name={user.name || user.email} size={48} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-neutral-900">{user.name}</p>
              <p className="truncate text-sm text-neutral-500">{user.email}</p>
            </div>
          </div>
          <dl className="mt-4 divide-y divide-neutral-100 border-t border-neutral-100 text-sm">
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-neutral-500">Roll</dt>
              <dd>
                <Badge tone={user.role === "admin" ? "brand" : "neutral"}>{ROLE_LABELS[user.role]}</Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-neutral-500">E-post</dt>
              <dd>
                {emailVerifiedAt ? (
                  <Badge tone="success" dot title={`Bekräftad ${formatDate(emailVerifiedAt)}`}>
                    Bekräftad
                  </Badge>
                ) : (
                  <Badge tone="warning" dot>
                    Ej bekräftad
                  </Badge>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 pt-3">
              <dt className="text-neutral-500">Lösenord</dt>
              <dd className="text-neutral-700">{hasPassword ? "Valt" : "Inget lösenord ännu"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{hasPassword ? "Byt lösenord" : "Välj ett lösenord"}</CardTitle>
          <CardDescription>
            {hasPassword
              ? "Ange ditt nuvarande lösenord och ditt nya lösenord."
              : "Du loggar in med Google eller via en inbjudan. Välj ett lösenord om du även vill kunna logga in med e-post och lösenord."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={changePasswordAction} className="space-y-4">
            <input type="email" name="username" autoComplete="username" value={user.email} readOnly hidden />
            {hasPassword ? (
              <Field htmlFor="currentPassword" label="Nuvarande lösenord" required>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </Field>
            ) : (
              // lib/actions/account.ts godtar valfritt "nuvarande lösenord" när kontot saknar lösenord.
              <input type="hidden" name="currentPassword" value="-" />
            )}

            <Field htmlFor="newPassword" label="Nytt lösenord" required hint="Minst 10 tecken.">
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={10}
                required
              />
            </Field>

            <Field htmlFor="confirmPassword" label="Upprepa nytt lösenord" required>
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
            {success ? <Alert tone="success">Lösenordet har sparats.</Alert> : null}

            <SubmitButton pendingText="Sparar…">{hasPassword ? "Spara nytt lösenord" : "Spara lösenord"}</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle>Avsluta kontot</CardTitle>
          <CardDescription>
            Tar bort ditt konto och dina medlemskap. Sajter du är ensam ägare till måste först få en annan
            ägare eller tas bort.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={closeAccountAction} className="flex flex-wrap items-end gap-3" aria-label="Avsluta kontot">
            <Field htmlFor="confirmEmail" label="Skriv din e-postadress för att bekräfta" className="min-w-[240px] flex-1">
              <Input id="confirmEmail" name="confirmEmail" type="email" required autoComplete="off" placeholder={user.email} />
            </Field>
            <ConfirmButton confirmText="Avsluta ditt konto permanent?">Avsluta kontot</ConfirmButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
