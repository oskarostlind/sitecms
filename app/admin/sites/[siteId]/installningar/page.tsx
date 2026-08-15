import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKeys, sites } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import {
  updateSiteSettings,
  regenerateRevalidateSecret,
  createApiKey,
  deleteApiKey,
} from "@/lib/actions/sites";
import { ConfirmButton } from "@/components/content/ConfirmButton";
import { AdminRevealSecret } from "@/components/admin/AdminRevealSecret";

const ERROR_MESSAGES: Record<string, string> = {
  missing: "Fyll i ett namn för sajten.",
};

function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

/** Masks all but the last 4 characters of an API key for display. */
function maskKey(key: string): string {
  const tail = key.slice(-4);
  return `•••• •••• •••• ${tail}`;
}

export default async function SiteSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
    newSecret?: string;
    newKey?: string;
    newKeyName?: string;
    deleted?: string;
  }>;
}) {
  const { siteId } = await params;
  await requireAdmin();
  const { error, success, newSecret, newKey, newKeyName, deleted } = await searchParams;

  const [site] = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1);
  if (!site) notFound();

  const keys = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.siteId, siteId))
    .orderBy(desc(apiKeys.createdAt));

  const errorMessage = error ? (ERROR_MESSAGES[error] ?? "Något gick fel. Försök igen.") : null;
  const inputClassName =
    "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
          Inställningar – {site.name}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Grundinställningar, revalidation och API-nycklar för sajten.
        </p>
      </div>

      {newSecret ? (
        <AdminRevealSecret
          title="Ny revalidate-hemlighet"
          description="Den gamla hemligheten slutade fungera direkt. Uppdatera kundens frontend-integration med det nya värdet nu."
          value={newSecret}
        />
      ) : null}

      {newKey ? (
        <AdminRevealSecret
          title="Ny API-nyckel"
          description={`Nyckeln "${newKeyName ?? ""}" skapades. Ge den till den integration som ska använda den.`}
          value={newKey}
        />
      ) : null}

      {deleted === "1" ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
          API-nyckeln togs bort. Integrationer som använde den kan inte längre autentisera.
        </div>
      ) : null}

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-neutral-900">Grundinställningar</h2>

        {errorMessage ? (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {errorMessage}
          </p>
        ) : null}
        {success === "1" ? (
          <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            Inställningarna har sparats.
          </p>
        ) : null}

        <form action={updateSiteSettings.bind(null, siteId)} className="mt-4 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-neutral-700">
              Namn
            </label>
            <input id="name" name="name" type="text" required defaultValue={site.name} className={inputClassName} />
          </div>
          <div>
            <label htmlFor="domain" className="block text-sm font-medium text-neutral-700">
              Domän
            </label>
            <input
              id="domain"
              name="domain"
              type="text"
              defaultValue={site.domain ?? ""}
              placeholder="T.ex. exempel.se"
              className={inputClassName}
            />
          </div>
          <div>
            <label htmlFor="revalidateUrl" className="block text-sm font-medium text-neutral-700">
              Revalidate-URL
            </label>
            <input
              id="revalidateUrl"
              name="revalidateUrl"
              type="text"
              defaultValue={site.revalidateUrl ?? ""}
              placeholder="https://kundsajt.se/api/revalidate"
              className={`${inputClassName} font-mono`}
            />
            <p className="mt-1 text-xs text-neutral-500">
              Anropas med hemligheten nedan varje gång innehåll sparas, så kundens sajt kan hämta nytt innehåll direkt.
            </p>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Spara
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-neutral-900">Revalidate-hemlighet</h2>
        <p className="mt-1 text-sm text-neutral-500">
          {site.revalidateSecret
            ? "En hemlighet är konfigurerad. Regenerera bara om du misstänker att den läckt — den gamla slutar fungera omedelbart."
            : "Ingen hemlighet konfigurerad ännu. Generera en och lägg in den i kundens revalidate-endpoint."}
        </p>
        <form action={regenerateRevalidateSecret.bind(null, siteId)} className="mt-3">
          <ConfirmButton
            confirmText="Regenerera hemligheten? Den gamla hemligheten slutar fungera omedelbart."
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            {site.revalidateSecret ? "Regenerera hemlighet" : "Generera hemlighet"}
          </ConfirmButton>
        </form>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-neutral-900">API-nycklar</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Varje nyckel ger full läs-/skrivåtkomst till sajtens innehåll via API:et. Om du tar bort en nyckel
          slutar alla integrationer som använder den att fungera omedelbart.
        </p>

        {keys.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">Inga API-nycklar ännu.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Namn</th>
                  <th className="px-4 py-2 font-medium">Nyckel</th>
                  <th className="px-4 py-2 font-medium">Skapad</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {keys.map((k) => (
                  <tr key={k.id}>
                    <td className="max-w-[180px] truncate px-4 py-3 text-neutral-900" title={k.name}>{k.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-neutral-500">{maskKey(k.key)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-500">{formatDate(k.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <form action={deleteApiKey.bind(null, siteId, k.id)}>
                        <ConfirmButton
                          confirmText={`Ta bort nyckeln "${k.name}"? Integrationer som använder den slutar fungera omedelbart.`}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                        >
                          Ta bort
                        </ConfirmButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}

        <form action={createApiKey.bind(null, siteId)} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <label htmlFor="keyName" className="block text-sm font-medium text-neutral-700">
              Namn på ny nyckel
            </label>
            <input
              id="keyName"
              name="name"
              type="text"
              required
              placeholder="T.ex. Frontend-integration"
              className={inputClassName}
            />
          </div>
          <button
            type="submit"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            + Skapa nyckel
          </button>
        </form>
      </div>
    </div>
  );
}
