import type { Site } from "@/components/admin/types";

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
  const inputClassName =
    "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-neutral-700">
            Namn
          </label>
          <input id="name" name="name" type="text" required placeholder="T.ex. Anna Andersson" className={inputClassName} />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
            E-post
          </label>
          <input id="email" name="email" type="email" required placeholder="anna@exempel.se" className={inputClassName} />
        </div>
      </div>

      <div>
        <span className="block text-sm font-medium text-neutral-700">Sajt(er)</span>
        {sites.length === 0 ? (
          <p className="mt-1 text-sm text-neutral-500">
            Det finns inga sajter ännu. Skapa en sajt innan du lägger till kundanvändare.
          </p>
        ) : (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {sites.map((site) => (
              <label
                key={site.id}
                className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700"
              >
                <input
                  type="checkbox"
                  name="siteIds"
                  value={site.id}
                  className="h-4 w-4 rounded border-neutral-300"
                />
                {site.name}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={sites.length === 0}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Skapa kundanvändare
        </button>
      </div>
    </form>
  );
}
