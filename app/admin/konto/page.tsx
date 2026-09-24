import { requireUser } from "@/lib/guard";
import { changePasswordAction } from "@/lib/actions/account";
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
          <dl className="mt-4 flex items-center justify-between gap-4 border-t border-neutral-100 pt-4 text-sm">
            <dt className="text-neutral-500">Roll</dt>
            <dd>
              <Badge tone={user.role === "admin" ? "brand" : "neutral"}>{ROLE_LABELS[user.role]}</Badge>
            </dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Byt lösenord</CardTitle>
          <CardDescription>Ange ditt nuvarande lösenord och ditt nya lösenord.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={changePasswordAction} className="space-y-4">
            <Field htmlFor="currentPassword" label="Nuvarande lösenord" required>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
              />
            </Field>

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
            {success ? <Alert tone="success">Lösenordet har uppdaterats.</Alert> : null}

            <SubmitButton pendingText="Sparar…">Spara nytt lösenord</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
