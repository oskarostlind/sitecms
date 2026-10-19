import Link from "next/link";
import { readReveal } from "@/lib/reveal-flash";
import { hashApiKey, maskApiKey } from "@/lib/api-keys";
import { ConsumeReveal } from "@/components/admin/ConsumeReveal";
import { notFound } from "next/navigation";
import { count, desc, eq } from "drizzle-orm";
import { BookOpen, Circle, CircleCheck, KeyRound, Plug, UserPlus } from "lucide-react";
import { db } from "@/lib/db";
import { apiKeys, pages, sites } from "@/lib/db/schema";
import { requireSiteOwner } from "@/lib/guard";
import { appUrl } from "@/lib/app-url";
import { createApiKey, deleteApiKey, regenerateRevalidateSecret, updateSiteSettings } from "@/lib/actions/sites";
import { checkConnection } from "@/lib/actions/integration";
import { formatDateTime, relativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  clientSnippet,
  configSnippet,
  envSnippet,
  healthCurlSnippet,
  packageJsonSnippet,
  revalidateRouteSnippet,
  SNIPPET_FILES,
  NPM_CHECK,
  npmConfigSnippet,
  NPM_INSTALL,
  NPM_PACKAGE,
  npmPackageJsonSnippet,
  npmRevalidateSnippet,
  npmUsageSnippet,
  STRIP_TYPES_COMMAND,
  suggestedRevalidateUrl,
  syncScriptSnippet,
  TSX_INSTALL,
  usageSnippet,
} from "@/lib/integration-snippets";
import { ConfirmButton } from "@/components/content/ConfirmButton";
import { CodeBlock } from "@/components/admin/CodeBlock";
import { CopyButton } from "@/components/admin/CopyButton";
import {
  Alert,
  Badge,
  ButtonLink,
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
  missing: "Sajten saknar namn — fyll i det under Inställningar och försök igen.",
};

function StepTitle({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <CardTitle className="flex items-center gap-3">
      <span
        aria-hidden
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-400 text-sm font-semibold text-brand-950"
      >
        {number}
      </span>
      <span>
        <span className="sr-only">Steg {number}: </span>
        {children}
      </span>
    </CardTitle>
  );
}

function ValueRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-neutral-100 py-2.5 last:border-b-0">
      <div className="min-w-0">
        <p className="font-mono text-xs font-medium text-neutral-500">{label}</p>
        <p className="break-all font-mono text-sm text-neutral-900">{value}</p>
        {hint ? <p className="mt-0.5 text-xs text-neutral-500">{hint}</p> : null}
      </div>
      <CopyButton value={value} variant="ghost" aria-label={`Kopiera ${label}`} />
    </div>
  );
}

function SubHeading({ file, children }: { file?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-neutral-900">
        {file ? <code className="font-mono">{file}</code> : null}
        {file && children ? " — " : null}
        {children}
      </h3>
    </div>
  );
}

export default async function IntegrationPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
    deleted?: string;
    check?: string;
    detail?: string;
  }>;
}) {
  const { siteId } = await params;
  await requireSiteOwner(siteId);
  const { error, success, deleted, check, detail } = await searchParams;
  // Nya hemligheter kommer från den krypterade engångscookien — aldrig från URL:en.
  const reveal = await readReveal(`site:${siteId}`);
  const newSecret = reveal?.revalidateSecret;
  const newKey = reveal?.apiKey;
  const newKeyName = reveal?.apiKeyName;
  const newKeyHash = newKey ? hashApiKey(newKey) : null;

  const [site] = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1);
  if (!site) notFound();

  const [keys, [pageCount], cmsUrl] = await Promise.all([
    db.select().from(apiKeys).where(eq(apiKeys.siteId, siteId)).orderBy(desc(apiKeys.createdAt)),
    db.select({ n: count() }).from(pages).where(eq(pages.siteId, siteId)),
    appUrl(),
  ]);

  const ctx = { apiUrl: cmsUrl, site: site.slug, domain: site.domain };
  const env = envSnippet({ ...ctx, apiKey: newKey, revalidateSecret: newSecret });

  const hasKey = keys.length > 0;
  const hasWebhook = Boolean(site.revalidateUrl && site.revalidateSecret);
  const hasSync = Boolean(site.lastSchemaSyncAt);
  const connectionOk = site.lastConnectionStatus === "ok";

  const checklist = [
    { done: hasKey, label: "API-nyckel skapad", href: "#nycklar" },
    { done: hasWebhook, label: "Revalidate-URL och hemlighet", href: "#nycklar" },
    { done: hasSync, label: "Schema synkat från sajten", href: "#kod" },
    { done: connectionOk, label: "Anslutningen testad", href: "#testa" },
  ];
  const doneCount = checklist.filter((c) => c.done).length;

  const errorMessage = error ? (ERROR_MESSAGES[error] ?? "Något gick fel. Försök igen.") : null;
  const membersHref = `/admin/sites/${siteId}/medlemmar`;

  return (
    <div className="max-w-3xl">
      {reveal ? <ConsumeReveal /> : null}
      <PageHeader
        title="Integration"
        description={`Koppla ${site.name} till sitecms: nycklar, kod att klistra in, test av anslutningen och inbjudan till kunden.`}
        actions={
          <ButtonLink href="/docs" variant="secondary" icon={<BookOpen />}>
            Utvecklardokumentation
          </ButtonLink>
        }
      />

      <div className="space-y-6">
        {/* Översikt */}
        <Card>
          <CardHeader>
            <CardTitle>
              {doneCount === checklist.length ? "Sajten är kopplad" : `${doneCount} av ${checklist.length} klara`}
            </CardTitle>
            <CardDescription>
              Gå igenom stegen nedan i ordning. Allt kan göras av utvecklaren själv — ingen på sitecms behöver göra
              något.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2">
              {checklist.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-700 transition-colors duration-150 hover:bg-neutral-50"
                  >
                    {item.done ? (
                      <CircleCheck aria-hidden className="size-4 shrink-0 text-emerald-600" />
                    ) : (
                      <Circle aria-hidden className="size-4 shrink-0 text-neutral-300" />
                    )}
                    <span className={cn(item.done && "text-neutral-900")}>{item.label}</span>
                    <span className="sr-only">{item.done ? "(klart)" : "(inte klart)"}</span>
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Steg 1 — Nycklar */}
        <Card id="nycklar" className="scroll-mt-6">
          <CardHeader>
            <StepTitle number={1}>Nycklar och miljövariabler</StepTitle>
            <CardDescription>
              Kundsajten behöver fyra miljövariabler. Lägg dem i <code className="font-mono">.env.local</code> lokalt
              och under Environment Variables hos Vercel (eller motsvarande).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {errorMessage ? <Alert tone="danger">{errorMessage}</Alert> : null}

            <div className="rounded-lg border border-neutral-200 px-4">
              <ValueRow label="CMS_API_URL" value={cmsUrl} hint="Adressen till sitecms." />
              <ValueRow label="CMS_SITE" value={site.slug} hint="Sajtens slug — en del av alla API-adresser." />
            </div>

            {/* API-nycklar */}
            <section aria-labelledby="api-nycklar" className="space-y-3">
              <div className="flex items-center gap-2">
                <KeyRound aria-hidden className="size-4 text-neutral-500" />
                <h3 id="api-nycklar" className="text-sm font-semibold text-neutral-900">
                  API-nycklar
                </h3>
              </div>
              <p className="text-sm text-neutral-500">
                Skickas i headern <code className="font-mono">x-api-key</code>. Nyckeln visas i klartext bara precis
                när den skapats — skapa en ny om du tappat bort den och ta bort den gamla.
              </p>

              {deleted === "1" ? <Alert tone="success">API-nyckeln togs bort.</Alert> : null}
              {newKey ? (
                <Alert tone="warning" title={`Nyckeln "${newKeyName ?? ""}" skapades`}>
                  Den finns nu i klartext i miljövariablerna nedan. Kopiera dem nu — nyckeln visas inte igen.
                </Alert>
              ) : null}

              {keys.length === 0 ? (
                <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-500">
                  Inga API-nycklar ännu. Skapa en nedan.
                </p>
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
                          <code className="font-mono text-xs text-neutral-700">
                            {newKey && newKeyHash === k.keyHash ? newKey : maskApiKey(k.keyHint)}
                          </code>
                        </Td>
                        <Td className="whitespace-nowrap text-neutral-500" title={formatDateTime(k.createdAt)}>
                          {relativeTime(k.createdAt)}
                        </Td>
                        <Td className="text-right">
                          <form action={deleteApiKey.bind(null, siteId, k.id)}>
                            <input type="hidden" name="returnTo" value="integration" />
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
                <input type="hidden" name="returnTo" value="integration" />
                <Field htmlFor="keyName" label="Namn på ny nyckel" className="min-w-[200px] flex-1">
                  <Input id="keyName" name="name" type="text" required placeholder="T.ex. Produktion" />
                </Field>
                <SubmitButton variant="secondary" pendingText="Skapar…">
                  + Skapa nyckel
                </SubmitButton>
              </form>
            </section>

            {/* Revalidate */}
            <section aria-labelledby="revalidate" className="space-y-3 border-t border-neutral-100 pt-6">
              <h3 id="revalidate" className="text-sm font-semibold text-neutral-900">
                Revalidate-webhook
              </h3>
              <p className="text-sm text-neutral-500">
                När kunden sparar något POST:ar sitecms <code className="font-mono">{"{ secret }"}</code> till den här
                adressen, så att sajten hämtar nytt innehåll inom några sekunder.
              </p>

              {success === "1" ? <Alert tone="success">Revalidate-URL:en har sparats.</Alert> : null}

              <form action={updateSiteSettings.bind(null, siteId)} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="returnTo" value="integration" />
                <input type="hidden" name="name" value={site.name} />
                <input type="hidden" name="domain" value={site.domain ?? ""} />
                <Field
                  htmlFor="revalidateUrl"
                  label="Revalidate-URL"
                  hint={`Med koden i steg 2 blir den ${suggestedRevalidateUrl(site.domain)}`}
                  className="min-w-[260px] flex-1"
                >
                  <Input
                    id="revalidateUrl"
                    name="revalidateUrl"
                    type="url"
                    defaultValue={site.revalidateUrl ?? ""}
                    placeholder={suggestedRevalidateUrl(site.domain)}
                    className="font-mono"
                    aria-describedby="revalidateUrl-hint"
                  />
                </Field>
                <SubmitButton variant="secondary" pendingText="Sparar…">
                  Spara revalidate-URL
                </SubmitButton>
              </form>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 px-4 py-3">
                <div className="text-sm">
                  <p className="font-medium text-neutral-800">Revalidate-hemlighet</p>
                  <p className="text-neutral-500">
                    {newSecret
                      ? "Ny hemlighet genererad — den finns i miljövariablerna nedan. Den gamla slutade fungera."
                      : site.revalidateSecret
                        ? "Konfigurerad. Visas bara när den genereras — regenerera om du behöver se den igen."
                        : "Ingen hemlighet ännu."}
                  </p>
                </div>
                <form action={regenerateRevalidateSecret.bind(null, siteId)}>
                  <input type="hidden" name="returnTo" value="integration" />
                  {site.revalidateSecret ? (
                    <ConfirmButton
                      variant="secondary"
                      size="sm"
                      confirmText="Regenerera hemligheten? Den gamla slutar fungera omedelbart och måste bytas på kundsajten."
                    >
                      Regenerera hemlighet
                    </ConfirmButton>
                  ) : (
                    <SubmitButton variant="secondary" size="sm" pendingText="Genererar…">
                      Generera hemlighet
                    </SubmitButton>
                  )}
                </form>
              </div>
            </section>

            {/* Env-block */}
            <section aria-labelledby="env" className="space-y-3 border-t border-neutral-100 pt-6">
              <h3 id="env" className="text-sm font-semibold text-neutral-900">
                Miljövariabler att kopiera
              </h3>
              {newKey || newSecret ? (
                <Alert tone="warning">
                  Blocket innehåller {newKey && newSecret ? "nyckeln och hemligheten" : newKey ? "nyckeln" : "hemligheten"}{" "}
                  i klartext. Kopiera det nu — det visas inte igen när du lämnar sidan.
                </Alert>
              ) : (
                <p className="text-sm text-neutral-500">
                  Nyckel och hemlighet visas bara direkt efter att de skapats. Skapa en ny nyckel eller generera en ny
                  hemlighet ovan så fylls de i här.
                </p>
              )}
              <CodeBlock code={env} filename={SNIPPET_FILES.env} language="env" maxHeight={null} />
            </section>
          </CardContent>
        </Card>

        {/* Steg 2 — Kod */}
        <Card id="kod" className="scroll-mt-6">
          <CardHeader>
            <StepTitle number={2}>Koppla sajten</StepTitle>
            <CardDescription>
              För Next.js 14.2+ med App Router. Paketet <code className="font-mono">{NPM_PACKAGE}</code> innehåller
              klienten, revalidate-routen och schema-sync — inga andra beroenden.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <SubHeading>Installera paketet</SubHeading>
              <CodeBlock code={NPM_INSTALL} language="bash" maxHeight={null} />
              <p className="text-sm text-neutral-500">
                Kör sedan <code className="font-mono">{NPM_CHECK}</code> för att verifiera nycklarna från steg 1.
              </p>
            </div>

            <div className="space-y-2">
              <SubHeading file={SNIPPET_FILES.revalidate}>tar emot webhooken</SubHeading>
              <p className="text-sm text-neutral-500">
                En rad. Tömmer cachetaggen <code className="font-mono">sitecms</code> när kunden sparar.
              </p>
              <CodeBlock code={npmRevalidateSnippet()} filename={SNIPPET_FILES.revalidate} language="ts" maxHeight={null} />
            </div>

            <div className="space-y-2">
              <SubHeading file={SNIPPET_FILES.config}>sajtens sidor och fält</SubHeading>
              <p className="text-sm text-neutral-500">
                Deklarera vad kunden ska kunna redigera. Etiketterna och hjälptexterna syns i panelen.{" "}
                <Link href="/docs#schema" className="text-brand-700 underline-offset-2 hover:text-brand-800 hover:underline">
                  Om formatet
                </Link>
                .
              </p>
              <CodeBlock code={npmConfigSnippet(ctx)} filename={SNIPPET_FILES.config} language="ts" />
            </div>

            <div className="space-y-2">
              <SubHeading file={SNIPPET_FILES.packageJson}>synka före varje build</SubHeading>
              <p className="text-sm text-neutral-500">
                Skapar sidor och fält som saknas, skriver aldrig över kundens innehåll och stoppar bygget om configen är
                ogiltig.
              </p>
              <CodeBlock code={npmPackageJsonSnippet()} filename={SNIPPET_FILES.packageJson} language="json" maxHeight={null} />
            </div>

            <div className="space-y-2">
              <SubHeading>Använd innehållet</SubHeading>
              <CodeBlock code={npmUsageSnippet()} filename="app/page.tsx" language="tsx" />
            </div>

            <details className="group rounded-lg border border-neutral-200 bg-neutral-50/60">
              <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-neutral-700 hover:text-neutral-900">
                Utan npm-paket — kopiera koden till repot i stället
              </summary>
              <div className="space-y-6 border-t border-neutral-200 px-4 py-5">
            <div className="space-y-2">
              <SubHeading file={SNIPPET_FILES.client}>klienten</SubHeading>
              <p className="text-sm text-neutral-500">
                <code className="font-mono">getContent()</code>, <code className="font-mono">getPosts()</code>,{" "}
                <code className="font-mono">getPost(slug)</code> och <code className="font-mono">block(content, sida, nyckel)</code>{" "}
                som alltid returnerar <code className="font-mono">{"{ value, html, alt }"}</code>.
              </p>
              <CodeBlock code={clientSnippet(ctx)} filename={SNIPPET_FILES.client} language="ts" />
            </div>

            <div className="space-y-2">
              <SubHeading file={SNIPPET_FILES.revalidate}>tar emot webhooken</SubHeading>
              <p className="text-sm text-neutral-500">
                Jämför hemligheten i konstant tid och tömmer cachetaggen <code className="font-mono">sitecms</code>.
              </p>
              <CodeBlock code={revalidateRouteSnippet()} filename={SNIPPET_FILES.revalidate} language="ts" />
            </div>

            <div className="space-y-2">
              <SubHeading file={SNIPPET_FILES.config}>sajtens sidor och fält</SubHeading>
              <p className="text-sm text-neutral-500">
                Deklarera vad kunden ska kunna redigera. Etiketterna och hjälptexterna syns i panelen.{" "}
                <Link href="/docs#schema" className="text-brand-700 underline-offset-2 hover:text-brand-800 hover:underline">
                  Om formatet
                </Link>
                .
              </p>
              <CodeBlock code={configSnippet(ctx)} filename={SNIPPET_FILES.config} language="ts" />
            </div>

            <div className="space-y-2">
              <SubHeading file={SNIPPET_FILES.sync}>skickar configen till sitecms</SubHeading>
              <p className="text-sm text-neutral-500">
                Skapar sidor och fält som saknas och skriver ut en rapport. Avslutar med felkod 1 om något gick fel, så
                att bygget stoppas.
              </p>
              <CodeBlock code={syncScriptSnippet()} filename={SNIPPET_FILES.sync} language="ts" />
            </div>

            <div className="space-y-2">
              <SubHeading file={SNIPPET_FILES.packageJson}>kör synken före varje build</SubHeading>
              <p className="text-sm text-neutral-500">
                Installera <code className="font-mono">tsx</code> som dev-beroende i kundsajten och lägg till
                skripten. Utan tsx (Node 22.6+) går det att köra{" "}
                <code className="font-mono">{STRIP_TYPES_COMMAND}</code> i stället.
              </p>
              <CodeBlock code={TSX_INSTALL} language="bash" maxHeight={null} />
              <CodeBlock code={packageJsonSnippet()} filename={SNIPPET_FILES.packageJson} language="json" maxHeight={null} />
            </div>

            <div className="space-y-2">
              <SubHeading>Använd innehållet</SubHeading>
              <CodeBlock code={usageSnippet()} filename="app/page.tsx" language="tsx" />
            </div>
              </div>
            </details>
          </CardContent>
        </Card>

        {/* Steg 3 — Testa */}
        <Card id="testa" className="scroll-mt-6">
          <CardHeader>
            <StepTitle number={3}>Testa anslutningen</StepTitle>
            <CardDescription>
              Skickar samma anrop som när kunden sparar och förväntar sig ett 2xx-svar från revalidate-URL:en.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {check === "ok" ? (
              <Alert tone="success" title="Anslutningen fungerar">
                {detail}
              </Alert>
            ) : check === "failed" ? (
              <Alert tone="danger" title="Anslutningen misslyckades">
                {detail}
              </Alert>
            ) : null}

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg border border-neutral-200 px-4 py-3">
                <dt className="text-xs font-medium text-neutral-500">Senaste test</dt>
                <dd className="mt-1 flex flex-wrap items-center gap-2">
                  {site.lastConnectionStatus === "ok" ? (
                    <Badge tone="success" dot>
                      Fungerar
                    </Badge>
                  ) : site.lastConnectionStatus === "failed" ? (
                    <Badge tone="danger" dot>
                      Misslyckades
                    </Badge>
                  ) : (
                    <Badge tone="neutral">Inte testad</Badge>
                  )}
                  {site.lastConnectionCheckedAt ? (
                    <span className="text-neutral-500" title={formatDateTime(site.lastConnectionCheckedAt)}>
                      {relativeTime(site.lastConnectionCheckedAt)}
                    </span>
                  ) : null}
                </dd>
              </div>
              <div className="rounded-lg border border-neutral-200 px-4 py-3">
                <dt className="text-xs font-medium text-neutral-500">Schema</dt>
                <dd className="mt-1 text-neutral-800">
                  {site.lastSchemaSyncAt ? (
                    <span title={formatDateTime(site.lastSchemaSyncAt)}>
                      Senaste schema-sync: {relativeTime(site.lastSchemaSyncAt)}
                    </span>
                  ) : (
                    <span>
                      Ingen sync ännu — kör <code className="font-mono text-xs">npx sitecms-next sync</code>
                    </span>
                  )}
                  <span className="block text-xs text-neutral-500">
                    {Number(pageCount?.n ?? 0)} {Number(pageCount?.n ?? 0) === 1 ? "sida" : "sidor"} i CMS:et
                  </span>
                </dd>
              </div>
            </dl>

            {!site.revalidateUrl || !site.revalidateSecret ? (
              <Alert tone="info">
                Ange revalidate-URL och generera en hemlighet i steg 1 innan du testar.
              </Alert>
            ) : (
              <p className="text-sm text-neutral-500">
                Testar <code className="break-all font-mono text-xs">{site.revalidateUrl}</code>
              </p>
            )}

            <form action={checkConnection.bind(null, siteId)}>
              <SubmitButton icon={<Plug />} pendingText="Testar…">
                Testa anslutningen
              </SubmitButton>
            </form>

            <div className="space-y-2 border-t border-neutral-100 pt-4">
              <p className="text-sm text-neutral-500">
                Kontrollera nyckeln från terminalen — svarar med sajtens namn och antal sidor:
              </p>
              <CodeBlock code={healthCurlSnippet(ctx)} language="bash" maxHeight={null} />
            </div>
          </CardContent>
        </Card>

        {/* Steg 4 — Bjud in */}
        <Card id="bjud-in" className="scroll-mt-6">
          <CardHeader>
            <StepTitle number={4}>Bjud in kunden</StepTitle>
            <CardDescription>
              Kunden får ett mejl, väljer ett lösenord och kan sedan redigera texter, bilder och inlägg — men inte
              nycklar, struktur eller inställningar.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <ButtonLink href={membersHref} icon={<UserPlus />}>
              Bjud in kunden
            </ButtonLink>
            <ButtonLink href="/docs" variant="ghost" icon={<BookOpen />}>
              Läs hela dokumentationen
            </ButtonLink>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
