import { ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/guard";
import { createSite } from "@/lib/actions/sites";
import { appUrl } from "@/lib/app-url";
import { AdminSiteForm } from "@/components/admin/AdminSiteForm";
import { AdminRevealSecret } from "@/components/admin/AdminRevealSecret";
import { CodeBlock } from "@/components/admin/CodeBlock";
import { ConsumeReveal } from "@/components/admin/ConsumeReveal";
import { readReveal } from "@/lib/reveal-flash";
import {
  envSnippet,
  initCommand,
  INIT_STEPS,
  isDefaultCmsUrl,
  maskKeyForDisplay as maskKey,
  snippetApiUrl,
} from "@/lib/integration-snippets";
import { Alert, ButtonLink, Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader } from "@/components/ui";

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
  const integrationHref = `/admin/sites/${siteId}/integration`;

  // Körs panelen på en annan adress än sitecms.se behöver kundsajten även CMS_API_URL.
  const cmsUrl = key ? await appUrl() : null;
  const extraEnv = cmsUrl && !isDefaultCmsUrl(cmsUrl) ? `\nCMS_API_URL=${snippetApiUrl(cmsUrl)}` : "";

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
                description={`Standardnyckel för "${siteName ?? "sajten"}". Den är det enda kundsajten behöver — den finns redan ifylld nedan.`}
                value={key}
              />

              <Card>
                <CardHeader>
                  <CardTitle>Koppla sajten på en minut</CardTitle>
                  <CardDescription>
                    För Next.js 14.2+ med App Router. Kopiera allt nu — nyckeln visas inte igen när du lämnar sidan.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-neutral-900">1. Kör i kundsajtens rotkatalog</h3>
                    <CodeBlock
                      code={initCommand(maskKey(key))}
                      copyValue={initCommand(key)}
                      language="bash"
                      maxHeight={null}
                    />
                    <ul className="list-disc space-y-0.5 pl-5 text-sm text-neutral-500 marker:text-neutral-300">
                      {INIT_STEPS.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ul>
                    <p className="text-xs text-neutral-500">
                      Nyckeln som argument sparas i terminalens historik. Vill du undvika det, kör{" "}
                      <code className="font-mono">{initCommand()}</code> utan nyckel så frågar kommandot efter den.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-neutral-900">2. Lägg samma variabel hos webbhotellet</h3>
                    <p className="text-sm text-neutral-500">
                      Under miljövariabler hos Vercel, Netlify, Cloudflare, Render eller din egen server.
                    </p>
                    <CodeBlock
                      code={envSnippet({ apiKey: maskKey(key) }) + extraEnv}
                      copyValue={envSnippet({ apiKey: key }) + extraEnv}
                      filename="Miljövariabel"
                      language="env"
                      maxHeight={null}
                    />
                  </div>

                  <p className="text-sm text-neutral-500">
                    Bygger du med en AI-assistent, eller använder du inte Next.js? Integrationssidan har en färdig
                    prompt och en väg med deploy hooks.
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <Alert tone="info">
              API-nyckeln visas bara en gång, direkt när sajten skapas. Har du inte sparat den skapar du en ny under
              sajtens integration och tar bort standardnyckeln.
            </Alert>
          )}

          <div className="flex flex-wrap gap-3">
            <ButtonLink href={integrationHref} icon={<ArrowRight />}>
              Fortsätt till Integration
            </ButtonLink>
            <ButtonLink href={`/admin/sites/${siteId}/installningar`} variant="secondary">
              Gå till sajtens inställningar
            </ButtonLink>
          </div>
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
