import { requireAdmin } from "@/lib/admin-guard";
import { createSite } from "@/lib/actions/sites";
import { AdminSiteForm } from "@/components/admin/AdminSiteForm";
import { AdminRevealSecret } from "@/components/admin/AdminRevealSecret";
import { Alert, ButtonLink, Card, CardContent, PageHeader } from "@/components/ui";

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
    <div className="max-w-2xl">
      <PageHeader
        breadcrumbs={[{ label: "Dina sajter", href: "/admin" }, { label: "Ny sajt" }]}
        title="Ny sajt"
        description='Skapar sajten, en förstasida ("Startsida") och en API-nyckel.'
      />

      {showReveal ? (
        <div className="space-y-4">
          <Alert tone="success">
            Sajten <span className="font-medium">{siteName}</span> har skapats.
          </Alert>

          <AdminRevealSecret
            title="API-nyckel"
            description={`Standardnyckel för "${siteName}". Ge den till kundens frontend-integration.`}
            value={key!}
          />

          <ButtonLink href={`/admin/sites/${siteId}/installningar`} variant="secondary">
            Gå till sajtens inställningar
          </ButtonLink>
        </div>
      ) : (
        <Card>
          <CardContent>
            {errorMessage ? (
              <Alert tone="danger" className="mb-4">
                {errorMessage}
              </Alert>
            ) : null}
            <AdminSiteForm action={createSite} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
