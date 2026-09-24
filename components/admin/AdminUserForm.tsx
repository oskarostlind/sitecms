import type { Site } from "@/components/admin/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Checkbox, Field, Input, SubmitButton } from "@/components/ui";

type AdminUserFormProps = {
  action: (formData: FormData) => void;
  sites: Site[];
};

/**
 * Create-customer-user form: name, email and a multi-select of sites the
 * new user gets a membership to. Plain server-rendered form (no client
 * state needed) submitted straight to the createCustomerUser server action
 * in lib/actions/users.ts.
 */
export function AdminUserForm({ action, sites }: AdminUserFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ny kundanvändare</CardTitle>
        <CardDescription>
          Skapar en användare med rollen &quot;Kund&quot; och genererar ett tillfälligt lösenord som visas en gång.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field htmlFor="name" label="Namn" required>
              <Input id="name" name="name" type="text" required placeholder="T.ex. Anna Andersson" />
            </Field>
            <Field htmlFor="email" label="E-post" required>
              <Input id="email" name="email" type="email" required placeholder="anna@exempel.se" />
            </Field>
          </div>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-neutral-800">Sajt(er)</span>
            {sites.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Det finns inga sajter ännu. Skapa en sajt innan du lägger till kundanvändare.
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

          <SubmitButton disabled={sites.length === 0} pendingText="Skapar…">
            Skapa kundanvändare
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
