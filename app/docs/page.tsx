import Link from "next/link";
import { ArrowRight, BookOpen, KeyRound, Package, RefreshCw, UserPlus, Workflow } from "lucide-react";
import { CodeBlock as AdminCodeBlock, type CodeBlockProps } from "@/components/admin/CodeBlock";
import { Card, CardContent } from "@/components/ui";
import {
  lightLinkClassName,
  pillClassName,
  spaceCodeBlockClassName,
  SpaceBreadcrumbs,
  SpaceHero,
} from "@/components/guides/GuideShell";
import { JsonLd } from "@/components/JsonLd";
import { absoluteUrl, breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import {
  clientSnippet,
  configSnippet,
  DEFAULT_CMS_URL,
  envSnippet,
  healthCurlSnippet,
  NPM_CHECK,
  npmConfigSnippet,
  npmExplicitClientSnippet,
  NPM_INSTALL,
  npmPackageJsonSnippet,
  npmPostsSnippet,
  npmRevalidateSnippet,
  NPM_SYNC,
  npmUsageSnippet,
  packageJsonSnippet,
  PLACEHOLDER_SITE,
  REVALIDATE_ROUTE_PATH,
  revalidateCurlSnippet,
  revalidateRouteSnippet,
  SNIPPET_FILES,
  STRIP_TYPES_COMMAND,
  syncScriptSnippet,
  TSX_INSTALL,
  usageSnippet,
} from "@/lib/integration-snippets";

export const dynamic = "force-static";

const CMS_URL = process.env.APP_URL?.trim().replace(/\/+$/, "") || DEFAULT_CMS_URL;
const ctx = { apiUrl: CMS_URL, site: PLACEHOLDER_SITE, domain: null };
const BASE = `${CMS_URL}/api/v1/sites/{slug}`;

/** Exakt format från docs/SELF-SERVICE.md, avsnitt B. */
const SCHEMA_EXAMPLE = `{
  "version": 1,
  "pages": [
    {
      "slug": "home",
      "title": "Startsida",
      "description": "Det besökaren ser först.",
      "blocks": [
        { "key": "hero.title", "type": "text", "label": "Rubrik", "help": "Max 60 tecken", "default": "Välkommen" },
        { "key": "hero.image", "type": "image", "label": "Hero-bild", "default": "https://…/hero.jpg", "defaultAlt": "Byggarbetare" },
        { "key": "intro.body", "type": "richtext", "label": "Ingress" }
      ]
    }
  ],
  "prune": false
}`;

const SCHEMA_POST_RESPONSE = `{
  "ok": true,
  "created": { "pages": 1, "blocks": 3 },
  "updated": { "pages": 0, "blocks": 0 },
  "orphans": [{ "pageSlug": "home", "key": "gammal.rubrik" }],
  "pruned": { "pages": 0, "blocks": 0 }
}`;

const SCHEMA_GET_RESPONSE = `{
  "version": 1,
  "pages": [
    {
      "slug": "home",
      "title": "Startsida",
      "description": "Det besökaren ser först.",
      "blocks": [
        { "key": "hero.title", "type": "text", "label": "Rubrik", "help": "Max 60 tecken", "hasValue": true },
        { "key": "hero.image", "type": "image", "label": "Hero-bild", "hasValue": true },
        { "key": "intro.body", "type": "richtext", "label": "Ingress", "hasValue": false }
      ]
    }
  ]
}`;

const SCHEMA_400_RESPONSE = `{
  "error": "Ogiltigt schema.",
  "issues": [
    "pages[0].blocks[1].type: måste vara text, richtext eller image",
    "pages[0].blocks[2].key: \\"Hero Title\\" matchar inte ^[a-z0-9][a-z0-9._-]*$"
  ]
}`;

const CONTENT_RESPONSE = `{
  "site": { "name": "JJ Bygg", "domain": "jjbygg.se" },
  "pages": [
    {
      "slug": "home",
      "title": "Startsida",
      "description": "Det besökaren ser först.",
      "blocks": [
        { "key": "hero.title", "type": "text", "label": "Rubrik", "value": "Välkommen", "alt": null, "html": null },
        { "key": "hero.image", "type": "image", "label": "Hero-bild", "value": "https://…/hero.jpg", "alt": "Byggarbetare", "html": null },
        { "key": "intro.body", "type": "richtext", "label": "Ingress", "value": "Vi bygger **tryggt**.", "alt": null, "html": "<p>Vi bygger <strong>tryggt</strong>.</p>" }
      ]
    }
  ],
  "services": [{ "title": "Takbyte", "description": "Komplett takbyte.", "price": "Från 1 200 kr/m²" }],
  "seo": [{ "pageSlug": "home", "title": "JJ Bygg — bygg i Mellerud", "description": "…", "ogImage": null }]
}`;

const POSTS_RESPONSE = `{
  "posts": [
    {
      "slug": "nytt-tak-pa-skolan",
      "title": "Nytt tak på skolan",
      "excerpt": "I veckan blev vi klara med…",
      "coverImage": "https://…/tak.jpg",
      "coverImageAlt": "Nylagt plåttak",
      "publishedAt": "2026-10-12T08:30:00.000Z"
    }
  ]
}`;

const POST_RESPONSE = `{
  "post": {
    "slug": "nytt-tak-pa-skolan",
    "title": "Nytt tak på skolan",
    "excerpt": "I veckan blev vi klara med…",
    "body": "## Bakgrund\\nSkolan behövde…",
    "bodyHtml": "<h2>Bakgrund</h2><p>Skolan behövde…</p>",
    "coverImage": "https://…/tak.jpg",
    "coverImageAlt": "Nylagt plåttak",
    "publishedAt": "2026-10-12T08:30:00.000Z"
  }
}`;

const HEALTH_RESPONSE = `{
  "ok": true,
  "site": { "name": "JJ Bygg", "slug": "jjbygg" },
  "pages": 4,
  "lastSchemaSyncAt": "2026-10-18T09:14:03.000Z"
}`;

const ERROR_RESPONSE = `{ "error": "Ogiltig API-nyckel för denna sajt." }`;

const TOC: { id: string; label: string; children?: { id: string; label: string }[] }[] = [
  { id: "kom-igang", label: "Kom igång på 10 minuter" },
  { id: "hur-det-fungerar", label: "Hur det hänger ihop" },
  {
    id: "npm",
    label: "Koppla sajten med npm",
    children: [
      { id: "npm-installera", label: "1. Installera" },
      { id: "npm-revalidate", label: "2. Revalidate-route" },
      { id: "npm-config", label: "3. sitecms.config.ts" },
      { id: "npm-sync", label: "4. Synka i prebuild" },
      { id: "npm-anvand", label: "5. Använd innehållet" },
    ],
  },
  { id: "cli", label: "CLI: sitecms-next" },
  { id: "schema", label: "Schema-format" },
  {
    id: "api",
    label: "API-referens",
    children: [
      { id: "api-autentisering", label: "Autentisering" },
      { id: "api-content", label: "GET content" },
      { id: "api-posts", label: "GET posts" },
      { id: "api-post", label: "GET posts/[slug]" },
      { id: "api-schema-get", label: "GET schema" },
      { id: "api-schema-post", label: "POST schema" },
      { id: "api-health", label: "GET health" },
      { id: "api-webhook", label: "Revalidate-webhook" },
      { id: "api-fel", label: "Felkoder" },
    ],
  },
  {
    id: "kod",
    label: "Utan npm (copy-paste)",
    children: [
      { id: "kod-klient", label: SNIPPET_FILES.client },
      { id: "kod-revalidate", label: SNIPPET_FILES.revalidate },
      { id: "kod-config", label: SNIPPET_FILES.config },
      { id: "kod-sync", label: SNIPPET_FILES.sync },
    ],
  },
];

const QUICKSTART = [
  {
    icon: UserPlus,
    title: "Skapa konto",
    body: (
      <>
        Registrera dig på{" "}
        <DocLink href="/signup">/signup</DocLink> och bekräfta e-postadressen. Inget kreditkort, ingen väntan.
      </>
    ),
  },
  {
    icon: Workflow,
    title: "Skapa en sajt",
    body: (
      <>
        Välj <strong>Ny sajt</strong> i panelen och ange namn och domän. Sajten får en <em>slug</em> (t.ex.{" "}
        <code>jjbygg</code>) som ingår i alla API-adresser. Du blir sajtens ägare.
      </>
    ),
  },
  {
    icon: KeyRound,
    title: "Hämta nycklar",
    body: (
      <>
        Öppna <strong>Integration</strong> för sajten. Skapa en API-nyckel och generera en revalidate-hemlighet och
        kopiera env-blocket till <code>.env.local</code> och till Vercel.
      </>
    ),
  },
  {
    icon: Package,
    title: "Installera sitecms-next",
    body: (
      <>
        <code>{NPM_INSTALL}</code> i kundsajten. Lägg till revalidate-routen (en rad) och ange{" "}
        <code>https://din-domän.se{REVALIDATE_ROUTE_PATH}</code> som revalidate-URL i panelen.
      </>
    ),
  },
  {
    icon: RefreshCw,
    title: "Deklarera fälten",
    body: (
      <>
        Beskriv sidor och fält i <code>{SNIPPET_FILES.config}</code> och lägg{" "}
        <code>&quot;prebuild&quot;: &quot;sitecms-next sync&quot;</code> i package.json. Fälten dyker upp i panelen
        vid nästa build. Tryck sedan på <strong>Testa anslutningen</strong>.
      </>
    ),
  },
  {
    icon: UserPlus,
    title: "Bjud in kunden",
    body: (
      <>
        Under <strong>Medlemmar</strong> bjuder du in kunden som redaktör. Kunden väljer lösenord via mejlet och kan
        börja redigera — ändringar syns på sajten inom några sekunder.
      </>
    ),
  },
];

/** Kodrutor i rymdnavy på docs (samma ram som header/footer). */
function CodeBlock({ className, ...props }: CodeBlockProps) {
  return <AdminCodeBlock {...props} className={className ? `${spaceCodeBlockClassName} ${className}` : spaceCodeBlockClassName} />;
}

function DocLink({ href, children }: { href: string; children: React.ReactNode }) {
  const className = lightLinkClassName;
  return href.startsWith("/") ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

function Section({
  id,
  eyebrow,
  title,
  intro,
  children,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-rubrik`} className="scroll-mt-28 border-t border-neutral-200 pt-12">
      {eyebrow ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">{eyebrow}</p>
      ) : null}
      <h2 id={`${id}-rubrik`} className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
      </h2>
      {intro ? <div className="mt-3 max-w-2xl text-base text-neutral-600">{intro}</div> : null}
      <div className="mt-8 space-y-6">{children}</div>
    </section>
  );
}

function SubSection({ id, title, children }: { id: string; title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div id={id} className="scroll-mt-28 space-y-4">
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      {children}
    </div>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-2xl space-y-3 text-[15px] leading-relaxed text-neutral-700 [&_code]:rounded [&_code]:bg-neutral-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-neutral-900 [&_li]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ul]:list-disc [&_ul]:space-y-1.5">
      {children}
    </div>
  );
}

function MethodBadge({ method }: { method: "GET" | "POST" }) {
  return (
    <span
      className={
        "inline-flex h-6 items-center rounded-md px-2 font-mono text-xs font-semibold " +
        (method === "GET" ? "bg-brand-50 text-brand-800 ring-1 ring-brand-200" : "bg-space-900 text-brand-300 ring-1 ring-space-700")
      }
    >
      {method}
    </span>
  );
}

function Endpoint({
  id,
  method,
  path,
  title,
  description,
  children,
}: {
  id: string;
  method: "GET" | "POST";
  path: string;
  title: string;
  description: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-28">
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <MethodBadge method={method} />
            <code className="break-all font-mono text-sm text-neutral-800">{path}</code>
          </div>
        </div>
        <Prose>{description}</Prose>
        {children}
      </CardContent>
    </Card>
  );
}

function DocTable({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-neutral-900">
          {rows.map((row, i) => (
            <tr key={i} className="align-top">
              {row.map((cell, j) => (
                <td key={j} className={"px-4 py-2.5 text-neutral-700 " + (j === 0 ? "whitespace-nowrap" : "")}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Toc() {
  return (
    <nav aria-label="Innehåll" className="text-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Innehåll</p>
      <ol className="mt-3 space-y-1.5">
        {TOC.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`} className="text-neutral-700 transition-colors duration-150 hover:text-brand-700">
              {item.label}
            </a>
            {item.children ? (
              <ol className="mt-1.5 space-y-1 border-l border-neutral-200 pl-3">
                {item.children.map((child) => (
                  <li key={child.id}>
                    <a
                      href={`#${child.id}`}
                      className="break-all text-neutral-500 transition-colors duration-150 hover:text-brand-700"
                    >
                      {child.label}
                    </a>
                  </li>
                ))}
              </ol>
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

const DOCS_MODIFIED = "2026-10-18";

export default function DocsPage() {
  return (
    <main>
      <JsonLd
        nodes={[
          {
            "@type": "TechArticle",
            headline: "Koppla en Next.js-sajt till sitecms",
            description:
              "Installera sitecms-next, deklarera fälten i sitecms.config.ts, synka i prebuild och hämta innehållet med en typad klient.",
            inLanguage: "sv-SE",
            dateModified: DOCS_MODIFIED,
            url: absoluteUrl("/docs"),
            proficiencyLevel: "Beginner",
            dependencies: "Next.js 14.2+ (App Router), sitecms-next",
            publisher: { "@id": `${SITE_URL}/#organization` },
            mainEntityOfPage: absoluteUrl("/docs"),
          },
          breadcrumbJsonLd([
            { name: "sitecms", path: "/" },
            { name: "Dokumentation", path: "/docs" },
          ]),
        ]}
      />
      {/* Hero */}
      <SpaceHero planet="corner" innerClassName="pb-16 pt-8 sm:pb-24 sm:pt-10">
        <SpaceBreadcrumbs items={[{ label: "sitecms", href: "/" }, { label: "Dokumentation" }]} />
        <div className="mx-auto mt-10 max-w-3xl text-center sm:mt-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-400/25 bg-brand-400/10 px-3 py-1 text-xs font-semibold text-brand-300">
            För utvecklare
          </span>
          <h1 className="mt-5 text-balance text-4xl font-extrabold tracking-[-0.02em] text-ink sm:text-5xl sm:leading-[1.05]">
            Koppla en Next.js-sajt till sitecms
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
            Deklarera vilka fält sajten har, hämta innehållet med en typad klient utan beroenden och låt kunden
            redigera själv. Allt går att sätta upp utan att prata med oss.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="#kom-igang" className={pillClassName({ size: "lg", className: "w-full sm:w-auto" })}>
              <BookOpen aria-hidden />
              Kom igång
            </a>
            <a href="#api" className={pillClassName({ variant: "outline", size: "lg", className: "w-full sm:w-auto" })}>
              API-referens
            </a>
          </div>
        </div>
      </SpaceHero>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-24 pt-10 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
            <Toc />
          </div>
        </aside>

        <div className="min-w-0 space-y-12">
          <details className="rounded-2xl border border-neutral-200 bg-white px-5 py-3 shadow-sm lg:hidden">
            <summary className="cursor-pointer text-sm font-medium text-neutral-800">Innehåll</summary>
            <div className="pt-3">
              <Toc />
            </div>
          </details>

          {/* Kom igång */}
          <Section
            id="kom-igang"
            eyebrow="Snabbstart"
            title="Kom igång på 10 minuter"
            intro="Från noll till en kundsajt som hämtar innehåll från sitecms och uppdateras när kunden sparar."
          >
            <ol className="grid gap-4 sm:grid-cols-2">
              {QUICKSTART.map((step, index) => (
                <li key={step.title}>
                  <Card className="h-full">
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-space-900 text-sm font-bold text-brand-400 ring-1 ring-space-700">
                          {index + 1}
                        </span>
                        <h3 className="text-base font-semibold tracking-tight">{step.title}</h3>
                      </div>
                      <div className="text-sm leading-relaxed text-neutral-600 [&_code]:rounded [&_code]:bg-neutral-100 [&_code]:px-1 [&_code]:font-mono [&_code]:text-[12.5px] [&_code]:text-neutral-900">
                        {step.body}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ol>

            <Prose>
              <p>Miljövariablerna som kundsajten behöver (värdena finns under Integration i panelen):</p>
            </Prose>
            <CodeBlock code={envSnippet(ctx)} filename={SNIPPET_FILES.env} language="env" maxHeight={null} />

            <Prose>
              <p>Kontrollera att nycklarna fungerar innan du skriver någon kod:</p>
            </Prose>
            <CodeBlock code={NPM_CHECK} language="bash" maxHeight={null} />
          </Section>

          {/* Hur det hänger ihop */}
          <Section id="hur-det-fungerar" eyebrow="Översikt" title="Hur det hänger ihop">
            <Prose>
              <ol>
                <li>
                  <strong>Kundsajten äger strukturen.</strong> <code>{SNIPPET_FILES.config}</code> beskriver vilka sidor
                  och fält som finns. <code>sitecms-next sync</code> skickar den till sitecms före varje build, och
                  panelen visar fälten med dina etiketter och hjälptexter.
                </li>
                <li>
                  <strong>Kunden äger innehållet.</strong> En synk skriver aldrig över det kunden har skrivit. Nya fält
                  får sitt <code>default</code>-värde; tomma fält fylls med <code>default</code>.
                </li>
                <li>
                  <strong>Sajten hämtar med cache.</strong> Klienten hämtar med <code>{`next: { tags: ["sitecms"] }`}</code>,
                  så sidorna kan vara statiska.
                </li>
                <li>
                  <strong>sitecms säger till när något ändrats.</strong> Vid varje sparning POST:ar sitecms{" "}
                  <code>{`{ "secret": "…" }`}</code> till din revalidate-URL, som kör{" "}
                  <code>revalidateTag(&quot;sitecms&quot;)</code>. Ändringen syns inom några sekunder.
                </li>
              </ol>
            </Prose>
          </Section>

          {/* npm */}
          <Section
            id="npm"
            eyebrow="Rekommenderat"
            title="Koppla sajten med npm"
            intro={
              <>
                Next.js 14.2+ med App Router. Paketet <code className="font-mono text-sm">sitecms-next</code> har inga
                beroenden och innehåller klienten, revalidate-routen och CLI:t för schema-sync.
              </>
            }
          >
            <SubSection id="npm-installera" title="1. Installera">
              <CodeBlock code={NPM_INSTALL} language="bash" maxHeight={null} />
              <Prose>
                <p>
                  Lägg miljövariablerna från <DocLink href="#kom-igang">Kom igång</DocLink> i <code>.env.local</code> och
                  i Vercel (Production och Preview). Kör <code>{NPM_CHECK}</code> för att se att de stämmer.
                </p>
              </Prose>
            </SubSection>

            <SubSection id="npm-revalidate" title={<>2. <code className="font-mono">{SNIPPET_FILES.revalidate}</code></>}>
              <Prose>
                <p>
                  En rad. Routen jämför <code>secret</code> med <code>CMS_REVALIDATE_SECRET</code> i konstant tid och tömmer
                  cachetaggen <code>sitecms</code>. Ange <code>https://din-domän.se{REVALIDATE_ROUTE_PATH}</code> som
                  revalidate-URL under Integration i panelen.
                </p>
              </Prose>
              <CodeBlock code={npmRevalidateSnippet()} filename={SNIPPET_FILES.revalidate} language="ts" maxHeight={null} />
            </SubSection>

            <SubSection id="npm-config" title={<>3. <code className="font-mono">{SNIPPET_FILES.config}</code></>}>
              <Prose>
                <p>
                  Vilka sidor och fält kunden ska kunna redigera, med etiketter och hjälptexter som syns i panelen.{" "}
                  <code>type</code> är <code>text</code> om det utelämnas. Formatet beskrivs under{" "}
                  <DocLink href="#schema">Schema-format</DocLink>.
                </p>
              </Prose>
              <CodeBlock code={npmConfigSnippet(ctx)} filename={SNIPPET_FILES.config} language="ts" />
            </SubSection>

            <SubSection id="npm-sync" title="4. Synka i prebuild">
              <Prose>
                <p>
                  <code>sitecms-next sync</code> skickar configen till sitecms före varje build. Saknade sidor och fält
                  skapas, kundens innehåll skrivs aldrig över, och bygget stoppas om configen är ogiltig. Saknas
                  miljövariablerna hoppas steget över (lägg till <code>--strict</code> om bygget ska faila då).
                </p>
              </Prose>
              <CodeBlock code={npmPackageJsonSnippet()} filename={SNIPPET_FILES.packageJson} language="json" maxHeight={null} />
              <Prose>
                <p>Vill du synka direkt utan att bygga:</p>
              </Prose>
              <CodeBlock code={NPM_SYNC} language="bash" maxHeight={null} />
            </SubSection>

            <SubSection id="npm-anvand" title="5. Använd innehållet">
              <Prose>
                <p>
                  <code>getContent()</code>, <code>getPosts()</code> och <code>getPost(slug)</code> läser{" "}
                  <code>CMS_API_URL</code>, <code>CMS_SITE</code> och <code>CMS_API_KEY</code> från miljön och cachar
                  med taggen <code>sitecms</code>, så sidorna kan vara statiska. <code>block()</code> returnerar alltid
                  strängar och är säker att rendera även om fältet saknas.
                </p>
              </Prose>
              <CodeBlock code={npmUsageSnippet()} filename="app/page.tsx" language="tsx" />
              <Prose>
                <p>Inlägg:</p>
              </Prose>
              <CodeBlock code={npmPostsSnippet()} filename="app/nyheter/[slug]/page.tsx" language="tsx" />
              <Prose>
                <p>Flera sajter i samma projekt, eller egna värden:</p>
              </Prose>
              <CodeBlock code={npmExplicitClientSnippet()} filename="lib/cms.ts" language="ts" maxHeight={null} />
            </SubSection>
          </Section>

          {/* CLI */}
          <Section
            id="cli"
            eyebrow="Verktyg"
            title="CLI: sitecms-next"
            intro="Följer med paketet. Läser CMS_API_URL, CMS_SITE och CMS_API_KEY från miljön eller .env.local / .env."
          >
            <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Kommando</th>
                    <th className="px-4 py-2.5 font-medium">Gör</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-700 [&_code]:font-mono [&_code]:text-[12.5px] [&_code]:text-neutral-900">
                  <tr>
                    <td className="px-4 py-2.5 align-top whitespace-nowrap"><code>sitecms-next sync</code></td>
                    <td className="px-4 py-2.5">Skickar <code>sitecms.config.ts</code> (eller .mjs/.js/.json) till sitecms och skriver ut vad som skapades. Exit 1 vid fel.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 align-top whitespace-nowrap"><code>--prune</code></td>
                    <td className="px-4 py-2.5">Tar också bort fält och sidor som inte längre finns i configen (inklusive innehållet).</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 align-top whitespace-nowrap"><code>--strict</code></td>
                    <td className="px-4 py-2.5">Låter bygget faila om miljövariablerna saknas (annars hoppas synken över).</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 align-top whitespace-nowrap"><code>--config &lt;fil&gt;</code></td>
                    <td className="px-4 py-2.5">Använd en annan config-fil.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 align-top whitespace-nowrap"><code>sitecms-next check</code></td>
                    <td className="px-4 py-2.5">Verifierar nycklarna och visar sajtens namn och senaste sync.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 align-top whitespace-nowrap"><code>sitecms-next pull</code></td>
                    <td className="px-4 py-2.5">Skriver ut strukturen som finns i sitecms som JSON.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>


          {/* Schema */}
          <Section
            id="schema"
            eyebrow="Struktur"
            title="Schema-format"
            intro="Kundsajten deklarerar sina sidor och fält, och sitecms skapar strukturen. Samma JSON skickas som body till POST …/schema."
          >
            <CodeBlock code={SCHEMA_EXAMPLE} filename="schema.json" language="json" maxHeight={null} />

            <DocTable
              head={["Fält", "Typ", "Beskrivning"]}
              rows={[
                [<code key="v">version</code>, "1", "Formatversion. Alltid 1."],
                [<code key="p">pages[]</code>, "array", "Max 100 sidor. Ordningen blir sidornas ordning i panelen."],
                [<code key="ps">pages[].slug</code>, "string", <>Unik per sajt. Matchar <code>^[a-z0-9][a-z0-9._-]*$</code>.</>],
                [<code key="pt">pages[].title</code>, "string", "Sidans namn i panelen."],
                [<code key="pd">pages[].description</code>, "string?", "En rad under sidans namn i editorn."],
                [<code key="pb">pages[].blocks[]</code>, "array", "Max 200 block per sida. Ordningen blir fältens ordning."],
                [<code key="bk">blocks[].key</code>, "string", <>Unik per sida, t.ex. <code>hero.title</code>. Samma mönster som slug.</>],
                [<code key="bt">blocks[].type</code>, "text | richtext | image", "Enrads/flerradstext, formaterad text (markdown → html) eller bild (URL + alt)."],
                [<code key="bl">blocks[].label</code>, "string?", "Etiketten kunden ser."],
                [<code key="bh">blocks[].help</code>, "string?", "Hjälptext under fältet."],
                [<code key="bd">blocks[].default</code>, "string?", "Startvärde när blocket skapas eller är tomt."],
                [<code key="ba">blocks[].defaultAlt</code>, "string?", "Startvärde för alt-texten (image)."],
                [<code key="pr">prune</code>, "boolean", <>Default <code>false</code>. <code>true</code> tar bort block och tomma sidor som inte finns i deklarationen.</>],
              ]}
            />

            <Prose>
              <p>
                <strong>Regler vid synk</strong>
              </p>
              <ul>
                <li>
                  Sidor och block som saknas skapas. Nya block får <code>value = default</code> och{" "}
                  <code>alt = defaultAlt</code>.
                </li>
                <li>
                  Befintliga block får ny <code>type</code>, <code>label</code>, <code>help</code> och ordning —{" "}
                  <strong>men <code>value</code>/<code>alt</code> skrivs aldrig över</strong>. Kundens innehåll vinner.
                  Ett tomt <code>value</code> fylls dock med <code>default</code>.
                </li>
                <li>Sidors <code>title</code>, <code>description</code> och ordning uppdateras från deklarationen.</li>
                <li>
                  Med <code>{`"prune": false`}</code> (default) tas inget bort; block som bara finns i CMS:et rapporteras
                  som <code>orphans</code>.
                </li>
                <li>
                  Fel i deklarationen ger <code>400</code> med en lista över problemen — inget sparas.
                </li>
              </ul>
            </Prose>
          </Section>

          {/* API */}
          <Section
            id="api"
            eyebrow="Referens"
            title="API-referens"
            intro={
              <>
                Bas-URL: <code className="break-all font-mono text-sm">{BASE}</code>. Alla svar är JSON och cachas inte av
                sitecms (<code className="font-mono text-sm">Cache-Control: private, no-store</code>) — cacha på din sida
                med <code className="font-mono text-sm">next.tags</code>.
              </>
            }
          >
            <SubSection id="api-autentisering" title="Autentisering">
              <Prose>
                <p>
                  Varje anrop kräver headern <code>x-api-key</code> med en nyckel som hör till sajten. Nycklar skapas och
                  tas bort under Integration. Använd dem bara på serversidan — en nyckel ger läsåtkomst till allt
                  publicerat innehåll och kan synka struktur.
                </p>
              </Prose>
              <CodeBlock
                code={`curl -H "x-api-key: $CMS_API_KEY" ${CMS_URL}/api/v1/sites/${PLACEHOLDER_SITE}/content`}
                language="bash"
                maxHeight={null}
              />
            </SubSection>

            <Endpoint
              id="api-content"
              method="GET"
              path={`${BASE}/content`}
              title="Hämta allt innehåll"
              description={
                <p>
                  Sajtens namn, alla sidor med block i ordning, synliga tjänster och SEO per sida. För richtext-block
                  finns färdig <code>html</code>; för bilder <code>alt</code>. <code>label</code> och{" "}
                  <code>description</code> kommer från schemat.
                </p>
              }
            >
              <CodeBlock code={CONTENT_RESPONSE} filename="200 OK" language="json" />
            </Endpoint>

            <Endpoint
              id="api-posts"
              method="GET"
              path={`${BASE}/posts`}
              title="Lista inlägg"
              description={<p>Publicerade inlägg, nyast först, utan brödtext — för listsidor.</p>}
            >
              <CodeBlock code={POSTS_RESPONSE} filename="200 OK" language="json" />
            </Endpoint>

            <Endpoint
              id="api-post"
              method="GET"
              path={`${BASE}/posts/{postSlug}`}
              title="Hämta ett inlägg"
              description={
                <p>
                  Ett publicerat inlägg med <code>body</code> (markdown) och <code>bodyHtml</code>. Utkast och okända
                  slugs ger <code>404</code>.
                </p>
              }
            >
              <CodeBlock code={POST_RESPONSE} filename="200 OK" language="json" />
            </Endpoint>

            <Endpoint
              id="api-schema-get"
              method="GET"
              path={`${BASE}/schema`}
              title="Läs nuvarande struktur"
              description={
                <p>
                  Strukturen i CMS:et i samma format som du skickar, men utan <code>default</code> och med{" "}
                  <code>hasValue</code> per block — så att du kan diffa mot <code>{SNIPPET_FILES.config}</code>.
                </p>
              }
            >
              <CodeBlock code={SCHEMA_GET_RESPONSE} filename="200 OK" language="json" />
            </Endpoint>

            <Endpoint
              id="api-schema-post"
              method="POST"
              path={`${BASE}/schema`}
              title="Synka struktur"
              description={
                <p>
                  Body: ett schema enligt <DocLink href="#schema">Schema-format</DocLink> med{" "}
                  <code>Content-Type: application/json</code>. Svaret berättar vad som skapades, uppdaterades och
                  (med <code>prune</code>) togs bort. Uppdaterar sajtens &quot;Senaste schema-sync&quot; i panelen.
                </p>
              }
            >
              <CodeBlock
                code={`curl -X POST ${CMS_URL}/api/v1/sites/${PLACEHOLDER_SITE}/schema \\
  -H "x-api-key: $CMS_API_KEY" \\
  -H "Content-Type: application/json" \\
  --data @schema.json`}
                language="bash"
                maxHeight={null}
              />
              <CodeBlock code={SCHEMA_POST_RESPONSE} filename="200 OK" language="json" maxHeight={null} />
              <CodeBlock code={SCHEMA_400_RESPONSE} filename="400 Bad Request" language="json" maxHeight={null} />
            </Endpoint>

            <Endpoint
              id="api-health"
              method="GET"
              path={`${BASE}/health`}
              title="Kontrollera nyckeln"
              description={
                <p>
                  Snabb kontroll av att slug och nyckel stämmer, utan att hämta innehåll. Bra i CI och för övervakning.
                </p>
              }
            >
              <CodeBlock code={healthCurlSnippet(ctx)} language="bash" maxHeight={null} />
              <CodeBlock code={HEALTH_RESPONSE} filename="200 OK" language="json" maxHeight={null} />
            </Endpoint>

            <Card id="api-webhook" className="scroll-mt-28">
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold tracking-tight">Revalidate-webhook (sitecms → din sajt)</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <MethodBadge method="POST" />
                    <code className="break-all font-mono text-sm text-neutral-800">
                      https://din-domän.se{REVALIDATE_ROUTE_PATH}
                    </code>
                  </div>
                </div>
                <Prose>
                  <p>
                    Varje gång innehåll sparas i panelen skickar sitecms en <code>POST</code> med{" "}
                    <code>Content-Type: application/json</code> och body <code>{`{ "secret": "<CMS_REVALIDATE_SECRET>" }`}</code>{" "}
                    till sajtens revalidate-URL (timeout 5 s, inga omförsök). Svara <code>2xx</code> när hemligheten
                    stämmer och <code>401</code> annars.
                  </p>
                  <p>
                    <strong>Testa anslutningen</strong> på integrationssidan skickar exakt samma anrop (timeout 8 s) och
                    visar statuskoden. Följer inte omdirigeringar — ange den slutliga adressen.
                  </p>
                </Prose>
                <CodeBlock code={revalidateCurlSnippet()} language="bash" maxHeight={null} />
                <CodeBlock code={`{ "revalidated": true }`} filename="200 OK" language="json" maxHeight={null} />
              </CardContent>
            </Card>

            <SubSection id="api-fel" title="Felkoder">
              <Prose>
                <p>
                  Fel returneras som <code>{`{ "error": "…" }`}</code> med en svensk beskrivning (schema-fel har även{" "}
                  <code>issues</code>).
                </p>
              </Prose>
              <DocTable
                head={["Status", "Betyder", "Vanlig orsak"]}
                rows={[
                  [<code key="400">400</code>, "Ogiltig förfrågan", "Schemat följer inte formatet (fel slug/key, okänd typ, fler än 100 sidor eller 200 block per sida), eller body är inte giltig JSON. Se issues."],
                  [<code key="401">401</code>, "Nyckel saknas eller är fel", <>Headern <code>x-api-key</code> saknas, nyckeln är borttagen eller hör till en annan sajt.</>],
                  [<code key="404">404</code>, "Hittades inte", "Okänd sajt-slug, eller inlägget finns inte / är inte publicerat."],
                  [<code key="413">413</code>, "För stort", "Request-bodyn är för stor för att tas emot. Kontrollera att schemat inte innehåller stora default-värden (t.ex. base64-bilder i stället för URL:er)."],
                ]}
              />
              <CodeBlock code={ERROR_RESPONSE} filename="401 Unauthorized" language="json" maxHeight={null} />
            </SubSection>
          </Section>

          {/* Utan npm */}
          <Section
            id="kod"
            eyebrow="Alternativ"
            title="Utan npm (copy-paste)"
            intro={
              <>
                Samma funktionalitet som <code className="font-mono text-sm">sitecms-next</code>, som filer i ditt eget
                repo. Inga beroenden utöver <code className="font-mono text-sm">tsx</code> för synkskriptet. På
                integrationssidan i panelen är sajtens slug och CMS-adress redan ifyllda.
              </>
            }
          >
            <SubSection id="kod-klient" title={<code className="font-mono">{SNIPPET_FILES.client}</code>}>
              <Prose>
                <p>
                  Typad klient: <code>getContent()</code>, <code>getPosts()</code>, <code>getPost(slug)</code> och
                  hjälparna <code>block(content, sida, nyckel)</code> → <code>{"{ value, html, alt }"}</code>,{" "}
                  <code>text()</code>, <code>image()</code> och <code>seo()</code>. <code>block()</code> returnerar alltid
                  strängar, så den är säker att rendera även om fältet saknas.
                </p>
              </Prose>
              <CodeBlock code={clientSnippet(ctx)} filename={SNIPPET_FILES.client} language="ts" />
              <Prose>
                <p>Användning i en sida:</p>
              </Prose>
              <CodeBlock code={usageSnippet()} filename="app/page.tsx" language="tsx" />
            </SubSection>

            <SubSection id="kod-revalidate" title={<code className="font-mono">{SNIPPET_FILES.revalidate}</code>}>
              <Prose>
                <p>
                  Tar emot webhooken från sitecms, jämför hemligheten i konstant tid och tömmer cachetaggen. Ange{" "}
                  <code>https://din-domän.se{REVALIDATE_ROUTE_PATH}</code> som revalidate-URL i panelen.
                </p>
              </Prose>
              <CodeBlock code={revalidateRouteSnippet()} filename={SNIPPET_FILES.revalidate} language="ts" />
            </SubSection>

            <SubSection id="kod-config" title={<code className="font-mono">{SNIPPET_FILES.config}</code>}>
              <Prose>
                <p>
                  Typad deklaration av sidor och fält. Formatet beskrivs under <DocLink href="#schema">Schema-format</DocLink>.
                </p>
              </Prose>
              <CodeBlock code={configSnippet(ctx)} filename={SNIPPET_FILES.config} language="ts" />
            </SubSection>

            <SubSection id="kod-sync" title={<code className="font-mono">{SNIPPET_FILES.sync}</code>}>
              <Prose>
                <p>
                  Läser <code>{SNIPPET_FILES.config}</code>, POST:ar den till <code>…/schema</code> och skriver ut vad som
                  skapades, uppdaterades och vilka fält som bara finns i CMS:et. Avslutar med felkod 1 vid fel, så att
                  bygget stoppas innan en trasig struktur går ut. Läser env från miljön eller{" "}
                  <code>.env.local</code>/<code>.env</code>.
                </p>
              </Prose>
              <CodeBlock code={syncScriptSnippet()} filename={SNIPPET_FILES.sync} language="ts" />
              <Prose>
                <p>
                  Installera <code>tsx</code> och kör synken före varje build. Utan tsx (Node 22.6 eller senare) fungerar{" "}
                  <code>{STRIP_TYPES_COMMAND}</code>.
                </p>
              </Prose>
              <CodeBlock code={TSX_INSTALL} language="bash" maxHeight={null} />
              <CodeBlock code={packageJsonSnippet()} filename={SNIPPET_FILES.packageJson} language="json" maxHeight={null} />
            </SubSection>
          </Section>

          <aside className="relative isolate overflow-hidden rounded-2xl border border-white/10 bg-space-900 p-6 text-ink shadow-[0_30px_80px_-40px_rgba(4,6,15,0.8)] sm:p-8">
            <div aria-hidden className="sc-stars pointer-events-none absolute inset-0 -z-10 opacity-40" />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_140%_at_50%_0%,rgba(93,240,168,0.12),transparent_55%)]"
            />
            <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-extrabold tracking-[-0.02em] sm:text-2xl">Redo att koppla din första sajt?</h2>
                <p className="mt-1 text-sm text-ink-muted">Skapa ett konto — det tar under en minut.</p>
              </div>
              <Link href="/signup" className={pillClassName({ size: "lg" })}>
                Skapa konto
                <ArrowRight aria-hidden />
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
