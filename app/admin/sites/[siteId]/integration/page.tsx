import Link from "next/link";
import { readReveal } from "@/lib/reveal-flash";
import { hashApiKey, maskApiKey } from "@/lib/api-keys";
import { ConsumeReveal } from "@/components/admin/ConsumeReveal";
import { notFound } from "next/navigation";
import { count, desc, eq, max } from "drizzle-orm";
import {
  BookOpen,
  Bot,
  ChartColumn,
  Circle,
  CircleCheck,
  Eye,
  Inbox,
  KeyRound,
  Plug,
  Server,
  Settings,
  Terminal,
  UserPlus,
  Webhook,
} from "lucide-react";
import { db } from "@/lib/db";
import { apiKeys, pages, quoteRequests, sites, trafficDaily } from "@/lib/db/schema";
import { requireSiteOwner } from "@/lib/guard";
import { appUrl } from "@/lib/app-url";
import { createApiKey, deleteApiKey, regenerateRevalidateSecret, updateSiteSettings } from "@/lib/actions/sites";
import { checkConnection } from "@/lib/actions/integration";
import { formatDate, formatDateTime, relativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  aiPromptSnippet,
  ANALYTICS_FILES,
  ANALYTICS_INSTALL,
  analyticsLayoutSnippet,
  analyticsRouteSnippet,
  clientSnippet,
  configSnippet,
  DEPLOY_HOOK_HOSTS,
  envSnippet,
  healthCurlSnippet,
  initCommand,
  INIT_STEPS,
  isDefaultCmsUrl,
  legacyEnvSnippet,
  maskKeyForDisplay,
  NPM_SYNC,
  npmQuoteSnippet,
  npmUsageSnippet,
  packageJsonSnippet,
  PREVIEW_FILES,
  PREVIEW_INSTALL,
  previewEditableSnippet,
  previewLayoutSnippet,
  previewNextConfigSnippet,
  previewRouteSnippet,
  QUOTE_ACTION_FILE,
  QUOTE_INSTALL,
  revalidateRouteSnippet,
  snippetApiUrl,
  SNIPPET_FILES,
  STRIP_TYPES_COMMAND,
  suggestedRevalidateUrl,
  syncScriptSnippet,
  TSX_INSTALL,
  usageSnippet,
} from "@/lib/integration-snippets";
import { REVALIDATE_URL_ERROR_MESSAGES } from "@/lib/webhook-url";
import { previewBaseUrl } from "@/lib/preview";
import { ConfirmButton } from "@/components/content/ConfirmButton";
import { CodeBlock } from "@/components/admin/CodeBlock";
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
  ...REVALIDATE_URL_ERROR_MESSAGES,
};

const linkClassName = "text-brand-700 underline-offset-2 hover:text-brand-800 hover:underline";

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

function IconTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <CardTitle className="flex items-center gap-3">
      <span
        aria-hidden
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 [&>svg]:size-4"
      >
        {icon}
      </span>
      <span>{children}</span>
    </CardTitle>
  );
}

function SubHeading({ file, children }: { file?: string; children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-neutral-900">
      {file ? <code className="font-mono">{file}</code> : null}
      {file && children ? " — " : null}
      {children}
    </h3>
  );
}

function Collapsible({
  id,
  summary,
  badge,
  defaultOpen,
  children,
}: {
  id: string;
  summary: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details id={id} open={defaultOpen} className="group scroll-mt-6 rounded-xl border border-neutral-200 bg-white">
      <summary className="flex cursor-pointer select-none flex-wrap items-center gap-x-3 gap-y-1 px-5 py-4 text-sm font-medium text-neutral-800 hover:text-neutral-950">
        <span>{summary}</span>
        {badge}
      </summary>
      <div className="space-y-6 border-t border-neutral-200 px-5 py-5">{children}</div>
    </details>
  );
}

function WebhookStatus({
  status,
  at,
  error,
  hasUrl,
}: {
  status: string | null;
  at: Date | null;
  error: string | null;
  hasUrl: boolean;
}) {
  const when = at ? (
    <span className="text-neutral-500" title={formatDateTime(at)}>
      {relativeTime(at)}
    </span>
  ) : null;

  return (
    <div className="rounded-lg border border-neutral-200 px-4 py-3 text-sm">
      <p className="text-xs font-medium text-neutral-500">Senaste webhook-anrop</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {status === "ok" ? (
          <Badge tone="success" dot>
            Fungerar
          </Badge>
        ) : status === "failed" ? (
          <Badge tone="danger" dot>
            Misslyckades
          </Badge>
        ) : (
          <Badge tone="neutral">{hasUrl ? "Inget anrop ännu" : "Ingen adress"}</Badge>
        )}
        {when}
      </div>
      {status === "failed" && error ? <p className="mt-2 break-words text-red-700">{error}</p> : null}
      {status === "failed" ? (
        <p className="mt-1 text-xs text-neutral-500">
          Kontrollera att adressen stämmer, att sajten är deployad med revalidate-routen och att{" "}
          <code className="font-mono">CMS_API_KEY</code> finns hos webbhotellet. Testa sedan igen i steg 3.
        </p>
      ) : status === null && hasUrl ? (
        <p className="mt-1 text-xs text-neutral-500">
          Skickas när kunden sparar något, eller när du trycker på Testa anslutningen.
        </p>
      ) : null}
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

  const [keys, [pageCount], cmsUrl, [traffic], [quotes]] = await Promise.all([
    db.select().from(apiKeys).where(eq(apiKeys.siteId, siteId)).orderBy(desc(apiKeys.createdAt)),
    db.select({ n: count() }).from(pages).where(eq(pages.siteId, siteId)),
    appUrl(),
    // Senaste dag med sidvisningar — visar om pixeln är på plats.
    db.select({ lastDay: max(trafficDaily.day) }).from(trafficDaily).where(eq(trafficDaily.siteId, siteId)),
    db
      .select({ n: count(), last: max(quoteRequests.createdAt) })
      .from(quoteRequests)
      .where(eq(quoteRequests.siteId, siteId)),
  ]);
  const lastTrafficDay = traffic?.lastDay ?? null;
  const quoteCount = Number(quotes?.n ?? 0);
  const lastQuoteAt = quotes?.last ?? null;

  // Körs panelen på en annan adress än sitecms.se (t.ex. lokalt) behöver
  // kundsajten även CMS_API_URL.
  const apiUrl = snippetApiUrl(cmsUrl);
  const customApiUrl = !isDefaultCmsUrl(cmsUrl);
  const ctx = { apiUrl, site: site.slug, domain: site.domain };
  const extraEnv = customApiUrl ? `\nCMS_API_URL=${apiUrl}` : "";
  // Nyckeln visas maskerad i kodrutorna; kopiera-knappen kopierar det riktiga värdet.
  const shownKey = newKey ? maskKeyForDisplay(newKey) : undefined;
  const env = envSnippet({ apiKey: shownKey }) + extraEnv;
  const envCopy = envSnippet({ apiKey: newKey }) + extraEnv;
  const legacyEnv = legacyEnvSnippet({ ...ctx, apiKey: newKey, revalidateSecret: newSecret });

  const hasKey = keys.length > 0;
  const hasRevalidateUrl = Boolean(site.revalidateUrl);
  const hasSync = Boolean(site.lastSchemaSyncAt);
  // Senaste riktiga webhook-anropet säger mest; annars senaste test.
  const connectionOk = (site.lastWebhookStatus ?? site.lastConnectionStatus) === "ok";
  const pageTotal = Number(pageCount?.n ?? 0);

  const checklist = [
    { done: hasKey, label: "API-nyckel", href: "#nycklar" },
    { done: hasRevalidateUrl, label: "Revalidate-URL", href: "#revalidate" },
    { done: hasSync, label: "Schema synkat från sajten", href: "#koppla" },
    { done: connectionOk, label: "Anslutningen testad", href: "#testa" },
  ];
  const doneCount = checklist.filter((c) => c.done).length;

  const errorMessage = error ? (ERROR_MESSAGES[error] ?? "Något gick fel. Försök igen.") : null;
  // Fel från formuläret för revalidate-URL visas i steg 2, övriga vid nycklarna.
  const revalidateErrorMessage = error?.startsWith("revalidate-url") ? errorMessage : null;
  const keysErrorMessage = revalidateErrorMessage ? null : errorMessage;
  const membersHref = `/admin/sites/${siteId}/medlemmar`;
  const suggestedUrl = suggestedRevalidateUrl(site.domain);
  const previewAddress = previewBaseUrl(site);

  return (
    <div className="max-w-3xl">
      {reveal ? <ConsumeReveal /> : null}
      <PageHeader
        title="Integration"
        description={`Koppla ${site.name} till sitecms: ett kommando, en miljövariabel, test av anslutningen och inbjudan till kunden.`}
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
              Allt kan göras av utvecklaren själv — ingen på sitecms behöver göra något.
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

        {/* Steg 1 — Koppla sajten */}
        <Card id="koppla" className="scroll-mt-6">
          <CardHeader>
            <StepTitle number={1}>Koppla sajten</StepTitle>
            <CardDescription>
              För Next.js 14.2+ med App Router. Kör kommandot i kundsajtens rotkatalog — det sätter upp allt som
              behövs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              {newKey ? (
                <Alert tone="warning" title={`Nyckeln "${newKeyName ?? ""}" är ifylld`}>
                  Kommandot och miljövariabeln nedan innehåller nyckeln (maskerad här, men kopiera-knappen kopierar den
                  riktiga). Kopiera dem nu — nyckeln visas inte igen när du lämnar sidan.
                </Alert>
              ) : null}
              <CodeBlock
                code={initCommand(shownKey)}
                copyValue={initCommand(newKey)}
                language="bash"
                maxHeight={null}
              />
              {newKey ? (
                <p className="text-sm text-neutral-500">
                  Nyckeln som argument sparas i terminalens historik. Vill du undvika det, kör{" "}
                  <code className="font-mono">{initCommand()}</code> utan nyckel så frågar kommandot efter den.
                </p>
              ) : (
                <p className="text-sm text-neutral-500">
                  Lägg API-nyckeln efter kommandot, eller låt det fråga efter den. Har du inte nyckeln kvar:{" "}
                  <a href="#nycklar" className={linkClassName}>
                    skapa en ny
                  </a>{" "}
                  så fylls den i här.
                </p>
              )}
              <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 px-4 py-3 text-sm text-neutral-700">
                <p className="font-medium text-neutral-800">Kommandot</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 marker:text-neutral-400">
                  {INIT_STEPS.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </div>
            </div>

            <section aria-labelledby="webbhotell" className="space-y-3 border-t border-neutral-100 pt-6">
              <div className="flex items-center gap-2">
                <Server aria-hidden className="size-4 text-neutral-500" />
                <h3 id="webbhotell" className="text-sm font-semibold text-neutral-900">
                  Lägg <code className="font-mono">CMS_API_KEY</code> hos ditt webbhotell
                </h3>
              </div>
              <p className="text-sm text-neutral-500">
                Samma värde som i <code className="font-mono">{SNIPPET_FILES.env}</code>, under miljövariabler hos
                webbhotellet — Vercel, Netlify, Cloudflare, Render eller din egen server. Det är den enda variabeln
                sajten behöver.
                {customApiUrl ? (
                  <>
                    {" "}
                    Den här installationen av sitecms körs på <code className="font-mono">{apiUrl}</code>, så lägg
                    även till <code className="font-mono">CMS_API_URL</code>.
                  </>
                ) : null}
              </p>
              <CodeBlock code={env} copyValue={envCopy} filename="Miljövariabel" language="env" maxHeight={null} />
            </section>

            <section aria-labelledby="anvand" className="space-y-3 border-t border-neutral-100 pt-6">
              <h3 id="anvand" className="text-sm font-semibold text-neutral-900">
                Använd innehållet och deploya
              </h3>
              <p className="text-sm text-neutral-500">
                Deklarera fälten i <code className="font-mono">{SNIPPET_FILES.config}</code> (
                <Link href="/docs#schema" className={linkClassName}>
                  om formatet
                </Link>
                ) och hämta dem i serverkomponenter. Vid nästa build synkas fälten till panelen, och revalidate-URL:en i
                steg 2 fylls i automatiskt om den saknas.
              </p>
              <CodeBlock code={npmUsageSnippet()} filename="app/page.tsx" language="tsx" />
            </section>

            <aside
              aria-labelledby="inte-nextjs"
              className="rounded-lg border border-neutral-200 bg-neutral-50/60 px-4 py-4 text-sm text-neutral-700"
            >
              <h3 id="inte-nextjs" className="font-semibold text-neutral-900">
                Inte Next.js?
              </h3>
              <p className="mt-1.5">
                Hämta innehållet från REST-API:t med <code className="font-mono">x-api-key</code> (se{" "}
                <Link href="/docs#api" className={linkClassName}>
                  API-referensen
                </Link>
                ) och klistra in webbhotellets deploy hook som revalidate-URL i steg 2. Då byggs sajten om automatiskt
                varje gång kunden sparar — {DEPLOY_HOOK_HOSTS.map((h) => h.name).join(", ").replace(/, ([^,]*)$/, " och $1")}{" "}
                har det, liksom de flesta andra.{" "}
                <Link href="/docs#deploy-hooks" className={linkClassName}>
                  Så gör du
                </Link>
                .
              </p>
            </aside>
          </CardContent>
        </Card>

        {/* AI-assistent */}
        <Card id="ai" className="scroll-mt-6">
          <CardHeader>
            <IconTitle icon={<Bot />}>Prompt till din AI-assistent</IconTitle>
            <CardDescription>
              Bygger du sajten med ChatGPT, Cursor eller Claude? Klistra in det här först, så använder assistenten
              sitecms-next i stället för att skriva egen kod som kräver en ny deploy för varje ändring. Prompten
              innehåller ingen nyckel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <CodeBlock code={aiPromptSnippet()} filename="Prompt" language="text" />
            <p className="text-sm text-neutral-500">
              Hela integrationen i maskinläsbar form finns på{" "}
              <a href="/llms.txt" className={linkClassName}>
                /llms.txt
              </a>
              .
            </p>
          </CardContent>
        </Card>

        {/* API-nycklar */}
        <Card id="nycklar" className="scroll-mt-6">
          <CardHeader>
            <IconTitle icon={<KeyRound />}>API-nycklar</IconTitle>
            <CardDescription>
              Nyckeln avgör vilken sajt innehållet hämtas från och används för att verifiera webhooken. Den visas i
              klartext bara precis när den skapats — skapa en ny om du tappat bort den och ta bort den gamla.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {keysErrorMessage ? <Alert tone="danger">{keysErrorMessage}</Alert> : null}
            {deleted === "1" ? <Alert tone="success">API-nyckeln togs bort.</Alert> : null}
            {newKey ? (
              <Alert tone="warning" title={`Nyckeln "${newKeyName ?? ""}" skapades`}>
                Den är ifylld i kommandot i{" "}
                <a href="#koppla" className="font-medium underline underline-offset-2">
                  steg 1
                </a>
                . Kopiera den nu — den visas inte igen.
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
          </CardContent>
        </Card>

        {/* Steg 2 — Revalidate-URL */}
        <Card id="revalidate" className="scroll-mt-6">
          <CardHeader>
            <StepTitle number={2}>Revalidate-URL</StepTitle>
            <CardDescription>
              När kunden sparar skickar sitecms en signerad webhook hit, så att sajten visar ändringen inom några
              sekunder — utan ny deploy. Sajter med domän får adressen automatiskt, och första synken från en publik
              https-adress fyller i den om den saknas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {revalidateErrorMessage ? <Alert tone="danger">{revalidateErrorMessage}</Alert> : null}
            {success === "1" ? <Alert tone="success">Revalidate-URL:en har sparats.</Alert> : null}

            <form action={updateSiteSettings.bind(null, siteId)} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="returnTo" value="integration" />
              <input type="hidden" name="name" value={site.name} />
              <input type="hidden" name="domain" value={site.domain ?? ""} />
              <Field
                htmlFor="revalidateUrl"
                label="Revalidate-URL"
                hint={`Med sitecms-next blir den ${suggestedUrl}. Inte Next.js? Klistra in webbhotellets deploy hook.`}
                className="min-w-[260px] flex-1"
              >
                <Input
                  id="revalidateUrl"
                  name="revalidateUrl"
                  type="url"
                  defaultValue={site.revalidateUrl ?? ""}
                  placeholder={suggestedUrl}
                  className="font-mono"
                  aria-describedby="revalidateUrl-hint"
                />
              </Field>
              <SubmitButton variant="secondary" pendingText="Sparar…">
                Spara revalidate-URL
              </SubmitButton>
            </form>

            <WebhookStatus
              status={site.lastWebhookStatus}
              at={site.lastWebhookAt}
              error={site.lastWebhookError}
              hasUrl={hasRevalidateUrl}
            />

            <div id="deploy-hook" className="flex gap-3 rounded-lg border border-neutral-200 px-4 py-3 text-sm">
              <Webhook aria-hidden className="mt-0.5 size-4 shrink-0 text-neutral-500" />
              <p className="text-neutral-600">
                <span className="font-medium text-neutral-800">Deploy hook i stället:</span> en build hook-URL från
                webbhotellet ({DEPLOY_HOOK_HOSTS.map((h) => h.name).join(", ")} m.fl.) tar emot samma anrop och bygger
                om sajten när kunden sparar. Det tar någon minut i stället för några sekunder, men fungerar med alla
                ramverk och helt statiska sajter.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Steg 3 — Testa */}
        <Card id="testa" className="scroll-mt-6">
          <CardHeader>
            <StepTitle number={3}>Testa anslutningen</StepTitle>
            <CardDescription>
              Skickar samma signerade anrop som när kunden sparar och förväntar sig ett 2xx-svar från revalidate-URL:en.
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
                      Ingen sync ännu — kör <code className="font-mono text-xs">{NPM_SYNC}</code>
                    </span>
                  )}
                  <span className="block text-xs text-neutral-500">
                    {pageTotal} {pageTotal === 1 ? "sida" : "sidor"} i CMS:et
                  </span>
                </dd>
              </div>
            </dl>

            {site.revalidateUrl ? (
              <p className="text-sm text-neutral-500">
                Testar <code className="break-all font-mono text-xs">{site.revalidateUrl}</code>
              </p>
            ) : (
              <Alert tone="info">
                Ange en revalidate-URL i{" "}
                <a href="#revalidate" className="font-medium underline underline-offset-2">
                  steg 2
                </a>{" "}
                innan du testar.
              </Alert>
            )}

            <form action={checkConnection.bind(null, siteId)}>
              <SubmitButton icon={<Plug />} pendingText="Testar…">
                Testa anslutningen
              </SubmitButton>
            </form>

            <div className="space-y-2 border-t border-neutral-100 pt-4">
              <p className="text-sm text-neutral-500">
                Kontrollera nyckeln från terminalen — svarar med sajtens namn, antal sidor och webhook-status:
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

        {/* Live-förhandsgranskning (valfritt) */}
        <Card id="forhandsgranskning" className="scroll-mt-6">
          <CardHeader>
            <IconTitle icon={<Eye />}>Live-förhandsgranskning</IconTitle>
            <CardDescription>
              Valfritt, från sitecms-next 0.4: kunden ser sajten bredvid fälten och den uppdateras medan hen skriver —
              innan något sparas. Klick på en rubrik eller bild i sajten öppnar rätt fält.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="text-xs font-medium text-neutral-500">Panelen öppnar</p>
                {previewAddress ? (
                  <code className="break-all font-mono text-xs text-neutral-800">{previewAddress}</code>
                ) : (
                  <span className="text-neutral-700">Ingen adress ännu — ange domän eller adress för förhandsgranskning.</span>
                )}
              </div>
              <ButtonLink href={`/admin/sites/${siteId}/installningar#previewUrl`} variant="ghost" size="sm" icon={<Settings />}>
                Ändra adress
              </ButtonLink>
            </div>

            <div className="space-y-2">
              <SubHeading>Uppgradera paketet</SubHeading>
              <CodeBlock code={PREVIEW_INSTALL} language="bash" maxHeight={null} />
            </div>
            <div className="space-y-2">
              <SubHeading file={PREVIEW_FILES.route}>routen som panelen öppnar</SubHeading>
              <CodeBlock code={previewRouteSnippet()} filename={PREVIEW_FILES.route} language="ts" maxHeight={null} />
            </div>
            <div className="space-y-2">
              <SubHeading file={PREVIEW_FILES.layout}>sist i body</SubHeading>
              <CodeBlock code={previewLayoutSnippet()} filename={PREVIEW_FILES.layout} language="tsx" maxHeight={null} />
            </div>
            <div className="space-y-2">
              <SubHeading>Markera klickbara element med editable()</SubHeading>
              <p className="text-sm text-neutral-500">
                Samma sida och nyckel som i <code className="font-mono">{SNIPPET_FILES.config}</code>. Sätt det på
                elementet som innehåller texten, eller på bilden.
              </p>
              <CodeBlock code={previewEditableSnippet()} filename="app/page.tsx" language="tsx" />
            </div>
            <div className="space-y-2">
              <SubHeading file={PREVIEW_FILES.nextConfig}>tillåt att panelen bäddar in sajten</SubHeading>
              <p className="text-sm text-neutral-500">
                Ta bort <code className="font-mono">X-Frame-Options</code> om sajten sätter den — CSP:n ersätter den.
                {customApiUrl ? (
                  <>
                    {" "}Panelen körs på <code className="font-mono">{apiUrl}</code>: skicka med den,{" "}
                    <code className="font-mono">previewFrameHeaders([&quot;{apiUrl}&quot;])</code>.
                  </>
                ) : null}
              </p>
              <CodeBlock code={previewNextConfigSnippet()} filename={PREVIEW_FILES.nextConfig} language="ts" maxHeight={null} />
            </div>
            <p className="text-sm text-neutral-500">
              Deploya och öppna en sida under Sidor → <strong className="font-medium text-neutral-700">Förhandsgranska</strong>.{" "}
              <Link href="/docs#forhandsgranskning" className={linkClassName}>
                Mer om förhandsgranskningen och felsökning
              </Link>
            </p>
          </CardContent>
        </Card>

        {/* Trafik (valfritt) */}
        <Card id="trafik" className="scroll-mt-6">
          <CardHeader>
            <IconTitle icon={<ChartColumn />}>Trafik</IconTitle>
            <CardDescription>
              Valfritt, från sitecms-next 0.6: besökare, sidor, källor, länder och enheter under SEO &amp; Trafik och på
              översikten. Cookiefri — inget cookie-meddelande behövs, och API-nyckeln når aldrig webbläsaren.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="text-xs font-medium text-neutral-500">Senaste sidvisning</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {lastTrafficDay ? (
                    <>
                      <Badge tone="success" dot>
                        Tar emot trafik
                      </Badge>
                      <span className="text-neutral-500">{formatDate(lastTrafficDay)}</span>
                    </>
                  ) : (
                    <Badge tone="neutral">Inga sidvisningar ännu</Badge>
                  )}
                </div>
              </div>
              <ButtonLink href={`/admin/sites/${siteId}/seo`} variant="ghost" size="sm" icon={<ChartColumn />}>
                SEO &amp; Trafik
              </ButtonLink>
            </div>

            <div className="space-y-2">
              <SubHeading>Uppgradera paketet</SubHeading>
              <p className="text-sm text-neutral-500">
                Eller kör <code className="font-mono">{initCommand()}</code> igen — det skapar routen nedan om den
                saknas och skriver inte över befintliga filer.
              </p>
              <CodeBlock code={ANALYTICS_INSTALL} language="bash" maxHeight={null} />
            </div>
            <div className="space-y-2">
              <SubHeading file={ANALYTICS_FILES.route}>tar emot sidvisningarna</SubHeading>
              <CodeBlock
                code={analyticsRouteSnippet()}
                filename={ANALYTICS_FILES.route}
                language="ts"
                maxHeight={null}
              />
            </div>
            <div className="space-y-2">
              <SubHeading file={ANALYTICS_FILES.layout}>sist i body</SubHeading>
              <p className="text-sm text-neutral-500">
                Kommandot rör inte layouten, så lägg in komponenten själv. Använder sajten redan{" "}
                <code className="font-mono">&lt;SitecmsPreview /&gt;</code> läggs den bredvid.
              </p>
              <CodeBlock
                code={analyticsLayoutSnippet()}
                filename={ANALYTICS_FILES.layout}
                language="tsx"
                maxHeight={null}
              />
            </div>
            <p className="text-sm text-neutral-500">
              Deploya och öppna sajten i en vanlig webbläsare — besök från localhost, förhandsgranskningen och robotar
              räknas inte.{" "}
              <Link href="/docs#trafik" className={linkClassName}>
                Vad som mäts och vad som aldrig lagras
              </Link>
            </p>
          </CardContent>
        </Card>

        {/* Offertförfrågningar (valfritt) */}
        <Card id="offert" className="scroll-mt-6">
          <CardHeader>
            <IconTitle icon={<Inbox />}>Offertförfrågningar</IconTitle>
            <CardDescription>
              Valfritt, från sitecms-next 0.5: sajtens offert- eller kontaktformulär skickar till sitecms. Förfrågningarna
              hamnar under Förfrågningar, företaget får mejl och kunden ett kvitto. Bilder och pdf:er följer med.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-neutral-200 px-4 py-3 text-sm">
                <p className="text-xs font-medium text-neutral-500">Mejl till företaget</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {site.notifyEmail ? (
                    <>
                      <Badge tone="success" dot>
                        På
                      </Badge>
                      <code className="break-all font-mono text-xs text-neutral-800">{site.notifyEmail}</code>
                    </>
                  ) : (
                    <Badge tone="warning">Ingen adress — inga mejl går ut</Badge>
                  )}
                </div>
                <Link
                  href={`/admin/sites/${siteId}/installningar#notifyEmail`}
                  className={cn(linkClassName, "mt-2 inline-block text-xs")}
                >
                  {site.notifyEmail ? "Ändra adress" : "Fyll i under Inställningar"}
                </Link>
              </div>
              <div className="rounded-lg border border-neutral-200 px-4 py-3 text-sm">
                <p className="text-xs font-medium text-neutral-500">Mottagna förfrågningar</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {quoteCount > 0 ? (
                    <>
                      <Badge tone="success" dot>
                        {quoteCount} st
                      </Badge>
                      {lastQuoteAt ? (
                        <span className="text-neutral-500" title={formatDateTime(lastQuoteAt)}>
                          senast {relativeTime(lastQuoteAt)}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <Badge tone="neutral">Inga ännu</Badge>
                  )}
                </div>
                <Link
                  href={`/admin/sites/${siteId}/forfragningar`}
                  className={cn(linkClassName, "mt-2 inline-block text-xs")}
                >
                  Öppna Förfrågningar
                </Link>
              </div>
            </div>

            <div className="space-y-2">
              <SubHeading>Uppgradera paketet</SubHeading>
              <CodeBlock code={QUOTE_INSTALL} language="bash" maxHeight={null} />
            </div>
            <div className="space-y-2">
              <SubHeading file={QUOTE_ACTION_FILE}>server action</SubHeading>
              <p className="text-sm text-neutral-500">
                Anropen bär API-nyckeln och görs alltid på servern — aldrig i webbläsaren. Sajten sköter honeypot och
                tidsfälla; sitecms validerar fälten igen, rate-limitar per <code className="font-mono">ipHash</code> och
                skickar tillbaka fältfel på svenska. Namn, telefon (svenskt nummer), e-post, typ av jobb, beskrivning och
                samtycke (<code className="font-mono">consent: true</code>) krävs. Saltet till{" "}
                <code className="font-mono">hashIp()</code> väljer du själv, t.ex. som{" "}
                <code className="font-mono">CMS_IP_SALT</code> hos webbhotellet.
              </p>
              <CodeBlock code={npmQuoteSnippet()} filename={QUOTE_ACTION_FILE} language="ts" />
            </div>
            <p className="text-sm text-neutral-500">
              Bilagor går genom sajtens server action: Next.js tar som standard emot 1 MB där, så höj{" "}
              <code className="font-mono">experimental.serverActions.bodySizeLimit</code> i{" "}
              <code className="font-mono">next.config</code> om formuläret tar bilder. På Vercel är taket 4,5 MB per
              anrop, även om sitecms tillåter 10 MB per fil.{" "}
              <Link href="/docs#kod-quote" className={linkClassName}>
                Alla fält och gränser
              </Link>
            </p>
          </CardContent>
        </Card>

        {/* Utan npm */}
        <Collapsible id="utan-npm" summary="Utan npm-paket — kopiera koden till repot i stället">
          <p className="text-sm text-neutral-500">
            Samma sak som <code className="font-mono">sitecms-next</code> gör, som filer i ditt eget repo. Kräver bara{" "}
            <code className="font-mono">CMS_API_KEY</code>, och revalidate-routen verifierar webhookens signatur med
            Web Crypto.
          </p>

          <div className="space-y-2">
            <SubHeading file={SNIPPET_FILES.client}>klienten</SubHeading>
            <p className="text-sm text-neutral-500">
              <code className="font-mono">getContent()</code>, <code className="font-mono">getPosts()</code>,{" "}
              <code className="font-mono">getPost(slug)</code> och{" "}
              <code className="font-mono">block(content, sida, nyckel)</code> som alltid returnerar{" "}
              <code className="font-mono">{"{ value, html, alt }"}</code>.
            </p>
            <CodeBlock code={clientSnippet(ctx)} filename={SNIPPET_FILES.client} language="ts" />
          </div>

          <div className="space-y-2">
            <SubHeading file={SNIPPET_FILES.revalidate}>tar emot webhooken</SubHeading>
            <p className="text-sm text-neutral-500">
              Verifierar signaturen med <code className="font-mono">CMS_API_KEY</code> (godtar även en äldre{" "}
              <code className="font-mono">CMS_REVALIDATE_SECRET</code>) och tömmer cachetaggen{" "}
              <code className="font-mono">sitecms</code>.
            </p>
            <CodeBlock code={revalidateRouteSnippet()} filename={SNIPPET_FILES.revalidate} language="ts" />
          </div>

          <div className="space-y-2">
            <SubHeading file={SNIPPET_FILES.config}>sajtens sidor och fält</SubHeading>
            <CodeBlock code={configSnippet(ctx)} filename={SNIPPET_FILES.config} language="ts" />
          </div>

          <div className="space-y-2">
            <SubHeading file={SNIPPET_FILES.sync}>skickar configen till sitecms</SubHeading>
            <p className="text-sm text-neutral-500">
              Skapar sidor och fält som saknas och skriver ut en rapport. Avslutar med felkod 1 om något gick fel, så
              att bygget stoppas.
            </p>
            <CodeBlock code={syncScriptSnippet(ctx)} filename={SNIPPET_FILES.sync} language="ts" />
          </div>

          <div className="space-y-2">
            <SubHeading file={SNIPPET_FILES.packageJson}>kör synken före varje build</SubHeading>
            <p className="text-sm text-neutral-500">
              Installera <code className="font-mono">tsx</code> som dev-beroende i kundsajten. Utan tsx (Node 22.6+)
              går det att köra <code className="font-mono">{STRIP_TYPES_COMMAND}</code> i stället.
            </p>
            <CodeBlock code={TSX_INSTALL} language="bash" maxHeight={null} />
            <CodeBlock code={packageJsonSnippet()} filename={SNIPPET_FILES.packageJson} language="json" maxHeight={null} />
          </div>

          <div className="space-y-2">
            <SubHeading>Använd innehållet</SubHeading>
            <CodeBlock code={usageSnippet()} filename="app/page.tsx" language="tsx" />
          </div>
        </Collapsible>

        {/* Äldre integrationer */}
        <Collapsible
          id="aldre"
          summary="Äldre integrationer (före sitecms-next 0.3)"
          defaultOpen={Boolean(newSecret)}
          badge={
            site.revalidateSecret ? (
              <Badge tone="success" dot>
                Hemlighet konfigurerad
              </Badge>
            ) : null
          }
        >
          <div className="space-y-2 text-sm text-neutral-600">
            <p>
              Sajter som kopplades med sitecms-next 0.2 eller den tidigare copy-paste-koden använder fyra
              miljövariabler och en revalidate-hemlighet. De fortsätter fungera som förut: sitecms skickar hemligheten
              i webhooken så länge den finns här, och API-adresserna med slug svarar likadant.
            </p>
            <p>
              Efter uppgradering till 0.3 (kör <code className="font-mono">{initCommand()}</code>) räcker{" "}
              <code className="font-mono">CMS_API_KEY</code> —{" "}
              <code className="font-mono">CMS_API_URL</code>, <code className="font-mono">CMS_SITE</code> och{" "}
              <code className="font-mono">CMS_REVALIDATE_SECRET</code> kan tas bort.{" "}
              <Link href="/docs#uppgradera" className={linkClassName}>
                Uppgradera från 0.2
              </Link>
              .
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 px-4 py-3">
            <div className="text-sm">
              <p className="font-medium text-neutral-800">Revalidate-hemlighet</p>
              <p className="text-neutral-500">
                {newSecret
                  ? "Ny hemlighet genererad — den finns i miljövariablerna nedan. Den gamla slutade fungera."
                  : site.revalidateSecret
                    ? "Konfigurerad. Visas bara när den genereras — regenerera om du behöver se den igen."
                    : "Ingen hemlighet. Behövs bara för integrationer före sitecms-next 0.3."}
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

          <div className="space-y-2">
            <SubHeading>De fyra variablerna</SubHeading>
            {newKey || newSecret ? (
              <Alert tone="warning">
                Blocket innehåller{" "}
                {newKey && newSecret ? "nyckeln och hemligheten" : newKey ? "nyckeln" : "hemligheten"} i klartext.
                Kopiera det nu — det visas inte igen när du lämnar sidan.
              </Alert>
            ) : (
              <p className="text-sm text-neutral-500">
                Nyckel och hemlighet visas bara direkt efter att de skapats.
              </p>
            )}
            <CodeBlock code={legacyEnv} filename={SNIPPET_FILES.env} language="env" maxHeight={null} />
          </div>
        </Collapsible>

        <p className="flex items-center gap-2 text-xs text-neutral-500">
          <Terminal aria-hidden className="size-3.5" />
          Kör <code className="font-mono">npx sitecms-next check</code> på kundsajten för att se att nyckeln fungerar.
        </p>
      </div>
    </div>
  );
}
