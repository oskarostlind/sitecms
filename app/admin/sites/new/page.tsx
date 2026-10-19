import { requireUser } from "@/lib/guard";
import { createSite } from "@/lib/actions/sites";
import { AdminSiteForm } from "@/components/admin/AdminSiteForm";
import { AdminRevealSecret } from "@/components/admin/AdminRevealSecret";
import { ConsumeReveal } from "@/components/admin/ConsumeReveal";
import { readReveal } from "@/lib/reveal-flash";
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
  }>;
}) {
  await requireUser();
  const { error, created, siteId } = await searchParams;

  // Nyckeln kommer från den krypterade engångscookien — aldrig från URL:en.
  const reveal = created === "1" && siteId ? await readReveal("new-site") : null;
  const key = reveal && reveal.siteId === siteId ? reveal.apiKey : undefined;
  const siteName = reveal && reveal.siteId === siteId ? reveal.siteName : undefined;

  const errorMessage = error ? (ERROR_MESSAGES[error] ?? "Något gick fel. Försök igen.") : null;
  const showCreated = created === "1" && Boolean(siteId);

  return (
    <div className="max-w-2xl">
      <PageHeader
        breadcrumbs={[{ label: "Dina sajter", href: "/admin" }, { label: "Ny sajt" }]}
        title="Ny sajt"
        description='Skapar sajten, en förstasida ("Startsida") och en API-nyckel.'
      />

      {showCreated ? (
        <div className="space-y-4">
          <Alert tone="success">
            Sajten {siteName ? <span className="font-medium">{siteName}</span> : null} har skapats.
          </Alert>

          {key ? (
            <>
              <ConsumeReveal />
              <AdminRevealSecret
                title="API-nyckel"
                description={`Standardnyckel för "${siteName ?? "sajten"}". Ge den till kundens frontend-integration.`}
                value={key}
              />
            </>
          ) : (
            <Alert tone="info">
              API-nyckeln visas bara en gång, direkt när sajten skapas. Har du inte sparat den skapar du en ny under
              sajtens integration och tar bort standardnyckeln.
            </Alert>
          )}

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
