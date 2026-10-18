import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKeys, sites } from "@/lib/db/schema";
import { requireSiteOwner } from "@/lib/guard";
import {
  updateSiteSettings,
  regenerateRevalidateSecret,
  createApiKey,
  deleteApiKey,
  removeSite,
} from "@/lib/actions/sites";
import { formatDateTime } from "@/lib/format";
import { ConfirmButton } from "@/components/content/ConfirmButton";
import { AdminRevealSecret } from "@/components/admin/AdminRevealSecret";
import {
  Alert,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
  PageHeader,
  SubmitButton,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from "@/components/ui";

const ERROR_MESSAGES: Record<string, string> = {
  missing: "Fyll i ett namn för sajten.",
  "confirm-name": "Skriv sajtens namn exakt som det står för att bekräfta borttagningen.",
};

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
  await requireSiteOwner(siteId);
  const { error, success, newSecret, newKey, newKeyName, deleted } = await searchParams;

  const [site] = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1);
  if (!site) notFound();

  const keys = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.siteId, siteId))
    .orderBy(desc(apiKeys.createdAt));

  const errorMessage = error ? (ERROR_MESSAGES[error] ?? "Något gick fel. Försök igen.") : null;

  return (
    <div className="max-w-3xl">
      <PageHeader title="Inställningar" description={`Grundinställningar, revalidation och API-nycklar för ${site.name}.`} />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Grundinställningar</CardTitle>
            <CardDescription>Namn, domän och webhook-URL:en som kundens sajt hämtar nytt innehåll från.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {errorMessage ? <Alert tone="danger">{errorMessage}</Alert> : null}
            {success === "1" ? <Alert tone="success">Inställningarna har sparats.</Alert> : null}

            <form action={updateSiteSettings.bind(null, siteId)} className="space-y-4">
              <Field htmlFor="name" label="Namn" required>
                <Input id="name" name="name" type="text" required defaultValue={site.name} />
              </Field>

              <Field htmlFor="domain" label="Domän" hint="T.ex. exempel.se – utan https://.">
                <Input id="domain" name="domain" type="text" defaultValue={site.domain ?? ""} placeholder="T.ex. exempel.se" />
              </Field>

              <Field
                htmlFor="revalidateUrl"
                label="Revalidate-URL"
                hint="Anropas med hemligheten nedan varje gång innehåll sparas, så kundens sajt kan hämta nytt innehåll direkt."
              >
                <Input
                  id="revalidateUrl"
                  name="revalidateUrl"
                  type="text"
                  defaultValue={site.revalidateUrl ?? ""}
                  placeholder="https://kundsajt.se/api/revalidate"
                  className="font-mono"
                />
              </Field>

              <SubmitButton pendingText="Sparar…">Spara</SubmitButton>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revalidate-hemlighet</CardTitle>
            <CardDescription>Delas med kundens revalidate-endpoint så att den kan verifiera anropen.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert tone="info">
              {site.revalidateSecret
                ? "En hemlighet är konfigurerad. Regenerera bara om du misstänker att den läckt — den gamla slutar fungera omedelbart."
                : "Ingen hemlighet konfigurerad ännu. Generera en och lägg in den i kundens revalidate-endpoint."}
            </Alert>

            {newSecret ? (
              <AdminRevealSecret
                title="Ny revalidate-hemlighet"
                description="Den gamla hemligheten slutade fungera direkt. Uppdatera kundens frontend-integration med det nya värdet nu."
                value={newSecret}
              />
            ) : null}

            <form action={regenerateRevalidateSecret.bind(null, siteId)}>
              <ConfirmButton
                variant="secondary"
                confirmText="Regenerera hemligheten? Den gamla hemligheten slutar fungera omedelbart."
              >
                {site.revalidateSecret ? "Regenerera hemlighet" : "Generera hemlighet"}
              </ConfirmButton>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API-nycklar</CardTitle>
            <CardDescription>
              Varje nyckel ger full läs-/skrivåtkomst till sajtens innehåll via API:et. Tar du bort en nyckel slutar
              alla integrationer som använder den att fungera omedelbart.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {deleted === "1" ? <Alert tone="success">API-nyckeln togs bort.</Alert> : null}

            {newKey ? (
              <AdminRevealSecret
                title="Ny API-nyckel"
                description={`Nyckeln "${newKeyName ?? ""}" skapades. Ge den till den integration som ska använda den.`}
                value={newKey}
              />
            ) : null}

            {keys.length === 0 ? (
              <p className="text-sm text-neutral-500">Inga API-nycklar ännu.</p>
            ) : (
              <Table>
                <Thead>
                  <Tr hover={false}>
                    <Th>Namn</Th>
                    <Th>Nyckel</Th>
                    <Th>Skapad</Th>
                    <Th />
                  </Tr>
                </Thead>
                <Tbody>
                  {keys.map((k) => (
                    <Tr key={k.id}>
                      <Td className="max-w-[180px] truncate" title={k.name}>
                        {k.name}
                      </Td>
                      <Td>
                        <AdminRevealSecret value={k.key} variant="inline" />
                      </Td>
                      <Td className="whitespace-nowrap text-neutral-500">{formatDateTime(k.createdAt)}</Td>
                      <Td className="text-right">
                        <form action={deleteApiKey.bind(null, siteId, k.id)}>
                          <ConfirmButton
                            variant="danger"
                            size="sm"
                            confirmText={`Ta bort nyckeln "${k.name}"? Integrationer som använder den slutar fungera omedelbart.`}
                          >
                            Ta bort
                          </ConfirmButton>
                        </form>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}

            <form action={createApiKey.bind(null, siteId)} className="flex flex-wrap items-end gap-3">
              <Field htmlFor="keyName" label="Namn på ny nyckel" className="min-w-[200px] flex-1">
                <Input id="keyName" name="name" type="text" required placeholder="T.ex. Frontend-integration" />
              </Field>
              <SubmitButton variant="secondary" pendingText="Skapar…">
                + Skapa nyckel
              </SubmitButton>
            </form>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader>
            <CardTitle>Ta bort sajten</CardTitle>
            <CardDescription>
              Tar bort sajten med alla sidor, fält, inlägg, tjänster, SEO-inställningar, API-nycklar och
              medlemskap. Det går inte att ångra.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={removeSite.bind(null, siteId)} className="flex flex-wrap items-end gap-3" aria-label="Ta bort sajten">
              <Field htmlFor="confirmName" label={`Skriv "${site.name}" för att bekräfta`} className="min-w-[240px] flex-1">
                <Input id="confirmName" name="confirmName" type="text" required autoComplete="off" placeholder={site.name} />
              </Field>
              <ConfirmButton confirmText={`Ta bort sajten "${site.name}" permanent? Allt innehåll försvinner.`}>
                Ta bort sajten
              </ConfirmButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
