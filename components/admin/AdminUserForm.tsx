import type { Site } from "@/components/admin/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Field,
  Input,
  Select,
  SubmitButton,
} from "@/components/ui";

type AdminUserFormProps = {
  action: (formData: FormData) => void;
  sites: Site[];
};

/**
 * "Bjud in användare" på /admin/anvandare: namn (valfritt), e-post, sajter
 * och roll. Skickas till inviteUserAction i lib/actions/users.ts som mejlar
 * en inbjudan per vald sajt. Ren server-renderad form.
 */
export function AdminUserForm({ action, sites }: AdminUserFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bjud in användare</CardTitle>
        <CardDescription>
          Skickar en inbjudan via e-post för varje vald sajt. Personen väljer själv sitt lösenord när hen accepterar
          — har adressen redan ett konto räcker det att logga in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field htmlFor="name" label="Namn" hint="Valfritt — personen kan ändra det när hen accepterar.">
              <Input
                id="name"
                name="name"
                type="text"
                maxLength={120}
                placeholder="T.ex. Anna Andersson"
                aria-describedby="name-hint"
              />
            </Field>
            <Field htmlFor="email" label="E-post" required>
              <Input id="email" name="email" type="email" required placeholder="anna@exempel.se" />
            </Field>
          </div>

          <Field htmlFor="role" label="Roll" className="sm:max-w-xs">
            <Select id="role" name="role" defaultValue="editor">
              <option value="editor">Redaktör — redigerar innehåll</option>
              <option value="owner">Ägare — även inställningar och medlemmar</option>
            </Select>
          </Field>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-neutral-800">Sajt(er)</span>
            {sites.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Det finns inga sajter ännu. Skapa en sajt innan du bjuder in användare.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {sites.map((site) => (
                  <Checkbox
                    key={site.id}
                    id={`site-${site.id}`}
                    name="siteIds"
                    value={site.id}
                    label={site.name}
                    className="rounded-lg border border-neutral-200 px-3 py-2"
                  />
                ))}
              </div>
            )}
          </div>

          <SubmitButton disabled={sites.length === 0} pendingText="Skickar…">
            Skicka inbjudan
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
