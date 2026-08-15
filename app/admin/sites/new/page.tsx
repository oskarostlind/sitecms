import { requireAdmin } from "@/lib/admin-guard";
import { createSite } from "@/lib/actions/sites";
import { AdminSiteForm } from "@/components/admin/AdminSiteForm";
import { AdminRevealSecret } from "@/components/admin/AdminRevealSecret";

const ERROR_MESSAGES: Record<string, string> = {
  missing: "Fyll i ett namn för sajten.",
  "invalid-slug": "Kunde inte generera en giltig slug från namnet. Ange en slug manuellt.",
};

export default async function NewSitePage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    created?: string;
    siteId?: string;
    siteName?: string;
    key?: string;
  }>;
}) {
  await requireAdmin();
  const { error, created, siteId, siteName, key } = await searchParams;

  const errorMessage = error ? (ERROR_MESSAGES[error] ?? "Något gick fel. Försök igen.") : null;
  const showReveal = created === "1" && siteId && siteName && key;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Ny sajt</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Skapar sajten, en förstasida ("Startsida") och en API-nyckel.
        </p>
      </div>

      {showReveal ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-sm text-green-800">
            Sajten <span className="font-medium">{siteName}</span> har skapats.
          </div>

          <AdminRevealSecret
            title="API-nyckel"
            description={`Standardnyckel för "${siteName}". Ge den till kundens frontend-integration.`}
            value={key!}
          />

          <a
            href={`/admin/sites/${siteId}/installningar`}
            className="inline-block rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Gå till sajtens inställningar
          </a>
        </div>
      ) : (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          {errorMessage ? (
            <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {errorMessage}
            </p>
          ) : null}
          <AdminSiteForm action={createSite} />
        </div>
      )}
    </div>
  );
}
