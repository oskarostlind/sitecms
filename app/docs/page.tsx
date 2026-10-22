import Link from "next/link";
import { ArrowRight, BookOpen, KeyRound, Rocket, Server, Terminal, UserPlus } from "lucide-react";
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
  aiPromptSnippet,
  ANALYTICS_FILES,
  ANALYTICS_INSTALL,
  ANALYTICS_ROUTE_PATH,
  analyticsLayoutSnippet,
  analyticsRouteSnippet,
  clientSnippet,
  configSnippet,
  DEFAULT_CMS_URL,
  DEPLOY_HOOK_HOSTS,
  envSnippet,
  eventsBodyExample,
  eventsCurlSnippet,
  healthCurlSnippet,
  INIT_COMMAND,
  initCommand,
  INIT_STEPS,
  LEGACY_SITE_API_PATH,
  legacyEnvSnippet,
  NPM_CHECK,
  npmConfigSnippet,
  npmExplicitClientSnippet,
  NPM_INSTALL,
  npmPackageJsonSnippet,
  npmPostsSnippet,
  npmQuoteSnippet,
  npmRevalidateSnippet,
  npmSeoSnippet,
  NPM_SYNC,
  NPM_UPGRADE,
  npmUsageSnippet,
  npmVerifyWebhookSnippet,
  packageJsonSnippet,
  PLACEHOLDER_SITE,
  PREVIEW_FILES,
  PREVIEW_INSTALL,
  PREVIEW_ROUTE_PATH,
  previewEditableSnippet,
  quoteAttachmentCurlSnippet,
  quoteRequestCurlSnippet,
  previewLayoutSnippet,
  previewNextConfigSnippet,
  previewRouteSnippet,
  REVALIDATE_ROUTE_PATH,
  revalidateCurlSnippet,
  revalidateRouteSnippet,
  signedWebhookCurlSnippet,
  SITE_API_PATH,
  SNIPPET_FILES,
  snippetApiUrl,
  STRIP_TYPES_COMMAND,
  syncScriptSnippet,
  TSX_INSTALL,
  usageSnippet,
  webhookBodyExample,
} from "@/lib/integration-snippets";

export const dynamic = "force-static";

const CMS_URL = snippetApiUrl(process.env.APP_URL?.trim() || DEFAULT_CMS_URL);
const ctx = { apiUrl: CMS_URL, site: PLACEHOLDER_SITE, domain: null };
const BASE = `${CMS_URL}${SITE_API_PATH}`;
const LEGACY_BASE = `${CMS_URL}${LEGACY_SITE_API_PATH}/{slug}`;

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
  "pruned": { "pages": 0, "blocks": 0 },
  "revalidateUrl": "https://jjbygg.se/api/sitecms/revalidate"
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
  "lastSchemaSyncAt": "2026-10-18T09:14:03.000Z",
  "revalidateUrl": "https://jjbygg.se/api/sitecms/revalidate",
  "webhook": {
    "configured": true,
    "lastStatus": "ok",
    "lastAt": "2026-10-20T14:02:11.000Z",
    "lastError": null
  }
}`;

const ERROR_RESPONSE = `{ "error": "Ogiltig API-nyckel." }`;

const QUOTE_REQUEST_BODY = `{
  "name": "Anna Andersson",
  "company": null,
  "phone": "070-123 45 67",
  "email": "anna@example.se",
  "jobType": "Takbyte",
  "machine": null,
  "location": "Luleå",
  "desiredStart": "2026-11-15",
  "description": "Byta tak på villa, ca 120 kvm. Befintligt tegeltak från 1978.",
  "consent": true,
  "customerType": "privat",
  "budget": "100 000–200 000 kr",
  "rot": true,
  "postalCode": "972 31",
  "source": "referrer=https://www.google.com/ sida=/offert utm_source=google",
  "attachments": [
    { "url": "https://….public.blob.vercel-storage.com/quotes/…/tomt.jpg", "name": "tomt.jpg", "contentType": "image/jpeg", "size": 182331 }
  ],
  "extra": { "takyta": "120 kvm", "antal-vaningar": "2" },
  "ipHash": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
}`;

const QUOTE_REQUEST_RESPONSE = `{ "id": "7c1a2f0e-…", "emailStatus": "sent" }`;

const QUOTE_REQUEST_400 = `{
  "error": "Valideringsfel.",
  "fields": {
    "phone": "Ange ett svenskt telefonnummer, t.ex. 070-123 45 67.",
    "consent": "Du behöver godkänna att vi behandlar dina uppgifter."
  }
}`;

const QUOTE_REQUEST_429 = `{ "error": "För många förfrågningar från samma adress. Försök igen om en stund eller ring oss." }`;

const QUOTE_ATTACHMENT_RESPONSE = `{
  "url": "https://….public.blob.vercel-storage.com/quotes/<siteId>/<uuid>-tomt-<suffix>.jpg",
  "name": "tomt.jpg",
  "contentType": "image/jpeg",
  "size": 182331
}`;

const PREVIEW_VERIFY_RESPONSE = `{
  "ok": true,
  "expiresAt": "2026-10-21T16:42:00.000Z",
  "panelOrigin": "https://sitecms.se"
}`;

const PREVIEW_INVALID_RESPONSE = `{
  "error": "Förhandsgranskningen har gått ut. Öppna den igen i sitecms.",
  "code": "preview_invalid"
}`;

/** Panelen bäddar in sajten via kundsajtens preview-route. */
const PREVIEW_FLOW = `Panelen                                     Kundsajten
────────                                     ──────────
Förhandsgranska → kortlivad session (2 h)
iframe: https://din-sajt.se${PREVIEW_ROUTE_PATH}?token=…&path=/
                                       ───►  verifierar token (GET …/preview)
                                             draft mode på + cookies → 307 till /
                                       ◄───  sidan renderas med osparade värden
kunden skriver   ── text/bild direkt   ───►  byts i sidan
                 ── efter 400 ms       ───►  sidan renderas om
klick på ett markerat element          ◄───  fältet fokuseras i panelen`;

/** Trafikpixeln: webbläsare → kundsajtens route → sitecms. */
const TRAFFIC_FLOW = `Besökarens webbläsare          Kundsajten                              sitecms
──────────────────────         ──────────                              ───────
<SitecmsAnalytics />
  POST ${ANALYTICS_ROUTE_PATH}
  { p, r, q }               ───►  + ip, ua, land från anropet
                                  POST …/events, x-api-key    ───►   robotfilter, normalisering
                                                                      visitor_hash = sha256(salt:dag:sajt:ip:ua)
                                                                      dagsaggregat uppdateras
                            ◄───  204                         ◄───   204
IP och user agent lagras aldrig — bara sökväg, källa, land, enhet och antal.`;

const EVENTS_400_RESPONSE = `{ "error": "Varje event måste ha fältet p (sökväg, sträng på högst 2048 tecken)." }`;

const EVENTS_429_RESPONSE = `{ "error": "För många events för sajten just nu (max 600 per minut). Försök igen om en stund." }`;

const WEBHOOK_HEADERS = `POST https://jjbygg.se${REVALIDATE_ROUTE_PATH}
content-type: application/json
user-agent: sitecms-webhook
x-sitecms-timestamp: 1792560000
x-sitecms-signature: v1=5f2b…c9e1,v1=a03d…77f0

${webhookBodyExample("jjbygg")}`;

/** Signaturen i Node, för mottagare i andra språk/ramverk. */
const SIGNATURE_NODE = `import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// rawBody = exakt den mottagna bodyn som sträng, timestamp = x-sitecms-timestamp
const keyHash = createHash("sha256").update(process.env.CMS_API_KEY!).digest("hex");
const expected = createHmac("sha256", keyHash).update(\`\${timestamp}.\${rawBody}\`).digest("hex");

const valid =
  Math.abs(Date.now() / 1000 - Number(timestamp)) <= 300 &&
  signatureHeader
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.startsWith("v1="))
    .some((part) => {
      const given = Buffer.from(part.slice(3), "hex");
      return given.length === 32 && timingSafeEqual(given, Buffer.from(expected, "hex"));
    });`;

/** Exempel för ett annat ramverk: hämta vid build. */
const BUILD_FETCH_EXAMPLE = `// Körs vid build (t.ex. i Astro, SvelteKit, Eleventy eller ett Node-skript)
const res = await fetch("${CMS_URL}${SITE_API_PATH}/content", {
  headers: { "x-api-key": process.env.CMS_API_KEY },
});
if (!res.ok) throw new Error(\`sitecms: HTTP \${res.status}\`);
const content = await res.json();

const hero = content.pages
  .find((p) => p.slug === "home")
  ?.blocks.find((b) => b.key === "hero.title");
console.log(hero?.value);`;

const TOC: { id: string; label: string; children?: { id: string; label: string }[] }[] = [
  { id: "kom-igang", label: "Kom igång på en minut" },
  { id: "hur-det-fungerar", label: "Hur det hänger ihop" },
  {
    id: "npm",
    label: "Koppla sajten med sitecms-next",
    children: [
      { id: "npm-init", label: "1. init" },
      { id: "npm-webbhotell", label: "2. Variabeln hos webbhotellet" },
      { id: "npm-config", label: "3. sitecms.config.ts" },
      { id: "npm-anvand", label: "4. Använd innehållet" },
      { id: "kod-quote", label: "Offertförfrågningar" },
      { id: "npm-manuellt", label: "Utan init" },
    ],
  },
  {
    id: "forhandsgranskning",
    label: "Live-förhandsgranskning",
    children: [
      { id: "forhandsgranskning-steg", label: "Slå på den" },
      { id: "forhandsgranskning-adress", label: "Vilken adress öppnas" },
      { id: "forhandsgranskning-felsok", label: "Felsökning" },
    ],
  },
  {
    id: "trafik",
    label: "Trafik",
    children: [
      { id: "trafik-matning", label: "Vad som mäts" },
      { id: "trafik-steg", label: "Slå på den" },
      { id: "trafik-felsok", label: "Felsökning" },
    ],
  },
  { id: "seo-poang", label: "SEO-poäng" },
  { id: "ai", label: "Med en AI-assistent" },
  { id: "deploy-hooks", label: "Andra ramverk: deploy hooks" },
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
      { id: "api-preview", label: "GET preview" },
      { id: "api-quote-requests", label: "POST quote-requests" },
      { id: "api-quote-attachments", label: "POST quote-requests/attachments" },
      { id: "api-events", label: "POST events" },
      { id: "api-webhook", label: "Webhook och signatur" },
      { id: "api-verifiera", label: "verifyWebhook()" },
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
  { id: "uppgradera", label: "Uppgradera från 0.2" },
];

const QUICKSTART = [
  {
    icon: UserPlus,
    title: "Skapa konto och sajt",
    body: (
      <>
        Registrera dig på <DocLink href="/signup">/signup</DocLink>, välj <strong>Ny sajt</strong> och ange namn och
        domän. API-nyckeln visas direkt, tillsammans med kommandot i nästa steg — färdigt att kopiera.
      </>
    ),
  },
  {
    icon: Terminal,
    title: "Kör init",
    body: (
      <>
        <code>{INIT_COMMAND} &lt;nyckel&gt;</code> i kundsajtens rotkatalog. Installerar paketet, sparar nyckeln i{" "}
        <code>.env.local</code>, skapar routerna (revalidate, förhandsgranskning, trafik) och{" "}
        <code>{SNIPPET_FILES.config}</code> och synkar fälten.
      </>
    ),
  },
  {
    icon: Server,
    title: "En variabel hos webbhotellet",
    body: (
      <>
        Lägg <code>CMS_API_KEY</code> i miljövariablerna hos Vercel, Netlify, Cloudflare, Render eller din egen
        server. Det är den enda variabeln.
      </>
    ),
  },
  {
    icon: Rocket,
    title: "Deklarera fälten och deploya",
    body: (
      <>
        Beskriv vad kunden får ändra i <code>{SNIPPET_FILES.config}</code> och läs det med <code>getContent()</code>{" "}
        i serverkomponenter. Vid build synkas fälten och revalidate-URL:en fylls i automatiskt.
      </>
    ),
  },
  {
    icon: KeyRound,
    title: "Testa anslutningen",
    body: (
      <>
        Tryck på <strong>Testa anslutningen</strong> under Integration i panelen, eller kör{" "}
        <code>{NPM_CHECK}</code>. Panelen visar status för varje webhook-anrop.
      </>
    ),
  },
  {
    icon: UserPlus,
    title: "Bjud in kunden",
    body: (
      <>
        Under <strong>Medlemmar</strong> bjuder du in kunden som redaktör. Kunden väljer lösenord via mejlet och kan
        börja redigera — ändringar syns på sajten inom några sekunder, utan ny deploy.
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

const DOCS_MODIFIED = "2026-10-23";

export default function DocsPage() {
  return (
    <main>
      <JsonLd
        nodes={[
          {
            "@type": "TechArticle",
            headline: "Koppla en Next.js-sajt till sitecms",
            description:
              "Koppla sajten med ett kommando (npx sitecms-next init) och en miljövariabel (CMS_API_KEY). Typad klient, schema-sync, signerad webhook och API-referens.",
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
            Ett kommando och en miljövariabel. Deklarera vilka fält sajten har, hämta innehållet med en typad klient och
            låt kunden redigera själv — ändringar syns direkt, utan ny deploy.
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
            title="Kom igång på en minut"
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
              <p>Kommandot (nyckeln finns under Integration i panelen):</p>
            </Prose>
            <CodeBlock code={initCommand("<api-nyckel>")} language="bash" maxHeight={null} />
            <Prose>
              <p>Och den enda miljövariabeln — i <code>.env.local</code> (det gör init) och hos webbhotellet:</p>
            </Prose>
            <CodeBlock code={envSnippet()} filename={SNIPPET_FILES.env} language="env" maxHeight={null} />
            <Prose>
              <p>
                Bygger du med ChatGPT, Cursor eller Claude? Ge assistenten <DocLink href="#ai">prompten nedan</DocLink>{" "}
                eller länka till <DocLink href="/llms.txt">/llms.txt</DocLink>. Inte Next.js? Se{" "}
                <DocLink href="#deploy-hooks">deploy hooks</DocLink>.
              </p>
            </Prose>
          </Section>

          {/* Hur det hänger ihop */}
          <Section id="hur-det-fungerar" eyebrow="Översikt" title="Hur det hänger ihop">
            <Prose>
              <ol>
                <li>
                  <strong>Nyckeln är sajten.</strong> <code>CMS_API_KEY</code> avgör vilken sajt innehållet hämtas från.
                  Ingen slug eller adress behöver konfigureras — standardadressen är <code>{DEFAULT_CMS_URL}</code>.
                </li>
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
                  <strong>sitecms säger till när något ändrats.</strong> Vid varje sparning skickar sitecms en signerad{" "}
                  <code>POST</code> till sajtens revalidate-URL, som verifierar signaturen med <code>CMS_API_KEY</code>{" "}
                  och kör <code>revalidateTag(&quot;sitecms&quot;)</code>. Ändringen syns inom några sekunder, och
                  panelen visar om anropet gick fram.
                </li>
              </ol>
            </Prose>
          </Section>

          {/* npm */}
          <Section
            id="npm"
            eyebrow="Rekommenderat"
            title="Koppla sajten med sitecms-next"
            intro={
              <>
                Next.js 14.2+ med App Router. Paketet <code className="font-mono text-sm">sitecms-next</code> har inga
                beroenden och innehåller klienten, revalidate-routen och CLI:t för init och schema-sync.
              </>
            }
          >
            <SubSection id="npm-init" title={<>1. <code className="font-mono">{INIT_COMMAND}</code></>}>
              <CodeBlock code={initCommand("<api-nyckel>")} language="bash" maxHeight={null} />
              <Prose>
                <p>
                  Utan argument läser kommandot nyckeln från <code>CMS_API_KEY</code> eller <code>.env.local</code>, och
                  frågar annars efter den. Det går att köra flera gånger — befintliga filer skrivs inte över. Kommandot:
                </p>
                <ul>
                  {INIT_STEPS.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
                <p>
                  I ett projekt utan Next.js App Router hoppar init över routerna — använd då en{" "}
                  <DocLink href="#deploy-hooks">deploy hook</DocLink>.
                </p>
              </Prose>
            </SubSection>

            <SubSection id="npm-webbhotell" title="2. Variabeln hos webbhotellet">
              <Prose>
                <p>
                  Lägg samma <code>CMS_API_KEY</code> under miljövariabler hos webbhotellet (för Production och
                  Preview). Det fungerar likadant hos Vercel, Netlify, Cloudflare, Render och på en egen Node-server.
                  Saknas variabeln vid build hoppar synken över med en varning — lägg till <code>--strict</code> om
                  bygget ska stoppas då.
                </p>
              </Prose>
              <CodeBlock code={envSnippet()} filename="Miljövariabel" language="env" maxHeight={null} />
              <Prose>
                <p>
                  <code>CMS_API_URL</code> behövs bara om du kör en egen installation av sitecms (standard{" "}
                  <code>{DEFAULT_CMS_URL}</code>). Sync skickar sajtens publika adress (<code>SITE_URL</code>, eller
                  webbhotellets egen variabel hos Vercel, Netlify och Render) så att sitecms kan fylla i
                  revalidate-URL:en <code>https://din-domän.se{REVALIDATE_ROUTE_PATH}</code> om den saknas. Befintliga
                  värden skrivs aldrig över.
                </p>
              </Prose>
            </SubSection>

            <SubSection id="npm-config" title={<>3. <code className="break-all font-mono">{SNIPPET_FILES.config}</code></>}>
              <Prose>
                <p>
                  Vilka sidor och fält kunden ska kunna redigera, med etiketter och hjälptexter som syns i panelen.{" "}
                  <code>type</code> är <code>text</code> om det utelämnas. Formatet beskrivs under{" "}
                  <DocLink href="#schema">Schema-format</DocLink>. Init skapar filen från strukturen som redan finns i
                  sitecms, eller med ett exempel.
                </p>
              </Prose>
              <CodeBlock code={npmConfigSnippet(ctx)} filename={SNIPPET_FILES.config} language="ts" />
              <Prose>
                <p>
                  Init lägger till <code>&quot;prebuild&quot;: &quot;sitecms-next sync&quot;</code>, så fälten synkas
                  före varje build. Vill du synka direkt: <code>{NPM_SYNC}</code>.
                </p>
              </Prose>
            </SubSection>

            <SubSection id="npm-anvand" title="4. Använd innehållet">
              <Prose>
                <p>
                  <code>getContent()</code>, <code>getPosts()</code> och <code>getPost(slug)</code> läser{" "}
                  <code>CMS_API_KEY</code> från miljön och cachar med taggen <code>sitecms</code>, så sidorna kan vara
                  statiska. Använd dem bara i serverkomponenter. <code>block()</code> returnerar alltid strängar och är
                  säker att rendera även om fältet saknas.
                </p>
              </Prose>
              <CodeBlock code={npmUsageSnippet()} filename="app/page.tsx" language="tsx" />
              <Prose>
                <p>SEO per sida:</p>
              </Prose>
              <CodeBlock code={npmSeoSnippet()} filename="app/page.tsx" language="tsx" maxHeight={null} />
              <Prose>
                <p>Inlägg:</p>
              </Prose>
              <CodeBlock code={npmPostsSnippet()} filename="app/nyheter/[slug]/page.tsx" language="tsx" />
              <Prose>
                <p>Flera sajter i samma projekt, eller egna värden:</p>
              </Prose>
              <CodeBlock code={npmExplicitClientSnippet()} filename="lib/cms.ts" language="ts" maxHeight={null} />
              <Prose>
                <p>
                  <strong>Undvik:</strong> att hämta innehållet i en klientkomponent eller i webbläsaren (API-nyckeln
                  exponeras), och egen <code>fetch</code> mot sitecms utan cache-taggen <code>sitecms</code> — då kan
                  webhooken inte tömma cachen och ändringar syns först efter nästa deploy.
                </p>
              </Prose>
            </SubSection>

            <SubSection id="kod-quote" title="Offertförfrågningar">
              <Prose>
                <p>
                  Har sajten ett offertformulär? Skicka det till sitecms med <code>submitQuoteRequest()</code> (sitecms-next
                  0.5+), så hamnar förfrågningarna under <strong>Förfrågningar</strong> i panelen och företaget får mejl
                  med kvitto till kunden. Bilder och pdf:er laddas upp först med <code>uploadQuoteAttachment()</code> och
                  skickas med som <code>attachments</code>. Anropen bär API-nyckeln och görs i en server action eller route
                  handler — aldrig i webbläsaren (funktionerna kastar ett tydligt fel där). Sajten gör spamkontrollerna som
                  kräver webbläsaren (honeypot, tidsfälla); sitecms validerar alla fält igen, rate-limitar per{" "}
                  <code>ipHash</code> (<code>hashIp()</code>), sparar och mejlar. Fältfel kommer tillbaka på svenska i{" "}
                  <code>SitecmsError.fields</code>.
                </p>
                <p>
                  Fyll i <strong>E-post för förfrågningar</strong> under Inställningar för sajten i panelen — annars sparas
                  förfrågan men inga mejl går ut (<code>emailStatus: &quot;skipped&quot;</code>). Alla fält och gränser:{" "}
                  <DocLink href="#api-quote-requests">API-referensen</DocLink>.
                </p>
              </Prose>
              <CodeBlock code={npmQuoteSnippet()} filename="app/offert/actions.ts" language="ts" />
            </SubSection>

            <SubSection id="npm-manuellt" title="Utan init">
              <Prose>
                <p>Samma sak för hand, om du vill se varje del:</p>
              </Prose>
              <CodeBlock code={NPM_INSTALL} language="bash" maxHeight={null} />
              <CodeBlock code={npmRevalidateSnippet()} filename={SNIPPET_FILES.revalidate} language="ts" maxHeight={null} />
              <CodeBlock code={npmPackageJsonSnippet()} filename={SNIPPET_FILES.packageJson} language="json" maxHeight={null} />
              <Prose>
                <p>
                  Lägg sedan <code>CMS_API_KEY</code> i <code>.env.local</code>, skapa <code>{SNIPPET_FILES.config}</code>{" "}
                  och kör <code>{NPM_CHECK}</code>.
                </p>
              </Prose>
            </SubSection>
          </Section>


          {/* Live-förhandsgranskning */}
          <Section
            id="forhandsgranskning"
            eyebrow="sitecms-next 0.4"
            title="Live-förhandsgranskning"
            intro={
              <>
                Kunden ser sin riktiga sajt bredvid fälten när hen redigerar en sida, och den uppdateras medan hen skriver
                — innan något sparas. Klick på en rubrik eller bild i sajten öppnar rätt fält. <strong>Spara</strong>{" "}
                fungerar som vanligt och går ut på sajten direkt.
              </>
            }
          >
            <Prose>
              <ul>
                <li>
                  Osparade ändringar ligger bara i en kortlivad session (2 timmar, förlängs medan kunden skriver) och
                  syns bara i förhandsgranskningen — aldrig för besökare.
                </li>
                <li>
                  Sajten visas i draft mode i en iframe. Bara förhandsgranskningen renderas dynamiskt; vanliga besök
                  får samma statiska, cachade sidor som förut.
                </li>
                <li>
                  Textfält och bilder byts direkt i sidan. Formaterad text och allt annat visas när sidan renderats om,
                  cirka en halv sekund efter att kunden slutat skriva.
                </li>
                <li>Inga utkast: en sida är antingen sparad (live) eller osparad i panelen.</li>
              </ul>
            </Prose>
            <CodeBlock code={PREVIEW_FLOW} filename="Flödet" language="text" maxHeight={null} />

            <SubSection id="forhandsgranskning-steg" title="Slå på den — fem steg">
              <Prose>
                <p>
                  <strong>1. Uppgradera paketet</strong> till 0.4 eller senare. Sajter på 0.2/0.3 fungerar som förut,
                  men utan förhandsgranskning.
                </p>
              </Prose>
              <CodeBlock code={PREVIEW_INSTALL} language="bash" maxHeight={null} />
              <Prose>
                <p>
                  <strong>2. Skapa routen</strong> som panelens iframe öppnar. Den verifierar token mot sitecms, slår på
                  draft mode och skickar vidare till sidan.
                </p>
              </Prose>
              <CodeBlock code={previewRouteSnippet()} filename={PREVIEW_FILES.route} language="ts" maxHeight={null} />
              <Prose>
                <p>
                  <strong>3. Lägg <code>&lt;SitecmsPreview /&gt;</code> i layouten</strong>, sist i{" "}
                  <code>&lt;body&gt;</code>. Den renderar ingenting utanför förhandsgranskningen och tar emot
                  ändringarna från panelen. Öppnar du sajten i draft mode utanför panelen visas en liten list med{" "}
                  <strong>Avsluta</strong>.
                </p>
              </Prose>
              <CodeBlock code={previewLayoutSnippet()} filename={PREVIEW_FILES.layout} language="tsx" maxHeight={null} />
              <Prose>
                <p>
                  <strong>4. Markera vad som går att klicka på</strong> med <code>editable(sida, nyckel)</code> — samma
                  sida och nyckel som i <code>{SNIPPET_FILES.config}</code>. Det sätter{" "}
                  <code>data-sitecms=&quot;sida:nyckel&quot;</code> på elementet (ofarligt i produktion). Sätt det på
                  elementet som innehåller själva texten: direkta textbyten fungerar bara när elementet inte har egna
                  barnelement. För bilder: på <code>&lt;img&gt;</code> eller ett element runt den.
                </p>
              </Prose>
              <CodeBlock code={previewEditableSnippet()} filename="app/page.tsx" language="tsx" />
              <Prose>
                <p>
                  <strong>5. Tillåt att panelen bäddar in sajten.</strong> <code>previewFrameHeaders()</code> ger en{" "}
                  <code>Content-Security-Policy</code> med <code>frame-ancestors</code> för sitecms. Ta bort{" "}
                  <code>X-Frame-Options</code> om sajten sätter den (CSP:n ersätter den). Har sajten redan en CSP: lägg
                  till <code>frame-ancestors</code> i den i stället för en andra header.
                </p>
              </Prose>
              <CodeBlock code={previewNextConfigSnippet()} filename={PREVIEW_FILES.nextConfig} language="ts" maxHeight={null} />
              <Prose>
                <p>
                  Deploya och öppna en sida i panelen → <strong>Förhandsgranska</strong>. Inga nya miljövariabler
                  behövs — routen använder samma <code>CMS_API_KEY</code>.
                </p>
              </Prose>
            </SubSection>

            <SubSection id="forhandsgranskning-adress" title="Vilken adress öppnas">
              <Prose>
                <p>Panelen öppnar den första av:</p>
                <ol>
                  <li>
                    <strong>Adress för förhandsgranskning</strong> under Inställningar — t.ex. en testadress hos
                    webbhotellet (<code>https://min-sajt-git-utveckling.vercel.app</code>), eller{" "}
                    <code>http://localhost:3000</code> när du utvecklar,
                  </li>
                  <li>
                    <code>https://</code> + sajtens domän,
                  </li>
                  <li>
                    adressen i revalidate-URL:en, om den slutar på <code>{REVALIDATE_ROUTE_PATH}</code>.
                  </li>
                </ol>
                <p>
                  Startsidan (<code>home</code>) öppnas som <code>/</code>, andra sidor som <code>/slug</code>. Kunden
                  kan sedan klicka sig runt fritt i sajten.
                </p>
              </Prose>
            </SubSection>

            <SubSection id="forhandsgranskning-felsok" title="Felsökning">
              <DocTable
                head={["Det kunden ser", "Vanlig orsak"]}
                rows={[
                  [
                    "Sajten svarar inte på förhandsgranskning",
                    <>
                      Panelen fick inget svar från sajten inom 10 sekunder: paketet är äldre än 0.4, routen eller{" "}
                      <code>&lt;SitecmsPreview /&gt;</code> saknas, eller sajten skickar <code>X-Frame-Options</code> /
                      saknar <code>frame-ancestors</code> för panelen.
                    </>,
                  ],
                  [
                    "Förhandsgranskningen kunde inte startas (på sajten)",
                    <>
                      Routen fick 401 när den verifierade token: <code>CMS_API_KEY</code> hör till en annan sajt, eller
                      sessionen har gått ut. Stäng och öppna förhandsgranskningen igen.
                    </>,
                  ],
                  [
                    "Ange sajtens adress",
                    "Sajten har varken adress för förhandsgranskning, domän eller revalidate-URL. Fyll i adressen under Inställningar.",
                  ],
                  [
                    "Ändringar syns först efter Spara",
                    <>
                      Sidan hämtar inte innehållet med <code>getContent()</code> från sitecms-next 0.4 (t.ex. en egen
                      klient), så den vet inte om förhandsgranskningen. Textbyten fungerar ändå på element med{" "}
                      <code>editable()</code>.
                    </>,
                  ],
                ]}
              />
              <Prose>
                <p>
                  Kör du sitecms lokalt (panelen på <code>http://localhost:3000</code>): ge panelens adress till{" "}
                  <code>previewFrameHeaders([&quot;http://localhost:3000&quot;])</code> och ange kundsajtens lokala
                  adress som adress för förhandsgranskning. På <code>http://localhost</code> sätter routen vanliga
                  cookies utan <code>Secure</code>.
                </p>
              </Prose>
            </SubSection>
          </Section>

          {/* Trafik */}
          <Section
            id="trafik"
            eyebrow="sitecms-next 0.6"
            title="Trafik"
            intro={
              <>
                Besökare och sidvisningar visas i panelen under <strong>SEO &amp; Trafik</strong> och på översikten —
                utan cookies, utan skript från tredje part och utan cookie-meddelande. Sajten skickar varje sidvisning
                till sin egen route, som skickar vidare till sitecms med API-nyckeln. Nyckeln når aldrig webbläsaren.
              </>
            }
          >
            <CodeBlock code={TRAFFIC_FLOW} filename="Flödet" language="text" maxHeight={null} />

            <SubSection id="trafik-matning" title="Vad som mäts — och vad som inte lagras">
              <Prose>
                <p>sitecms lagrar bara dagssummor per sajt. Per dag (UTC) räknas:</p>
                <ul>
                  <li>
                    <strong>Sidvisningar</strong> och <strong>unika besökare</strong>. En besökare är en hash av dag,
                    sajt, IP-adress och user agent med ett hemligt salt — hashen går inte att vända, och i morgon blir
                    det en ny, så samma person kan inte följas mellan dagar.
                  </li>
                  <li>
                    <strong>Sida</strong>: sökvägen utan query och hash, max 200 tecken. Fler än 500 olika sökvägar
                    samma dag bokförs som <code>/…</code>.
                  </li>
                  <li>
                    <strong>Källa</strong>: <code>direkt</code> (ingen referer eller egen domän), <code>utm:…</code>{" "}
                    från <code>utm_source</code>, annars refererens värd klassad som t.ex. <code>google</code>,{" "}
                    <code>linkedin</code>, <code>ai:chatgpt</code> eller <code>ref:example.com</code>.
                  </li>
                  <li>
                    <strong>Land</strong>: tvåbokstavskod från webbhotellets geo-header (Vercel, Cloudflare), annars{" "}
                    <code>ZZ</code>.
                  </li>
                  <li>
                    <strong>Enhet</strong>: mobil, surfplatta eller dator, avläst från user agent.
                  </li>
                </ul>
                <p>
                  <strong>Lagras aldrig:</strong> IP-adress, user agent, tidsstämpel per besök eller några råevents.
                  Inga cookies, ingen <code>localStorage</code>, inget fingerprinting utöver dagshashen. Robotar och
                  verktyg (Googlebot, Lighthouse, curl …) filtreras bort, och fler än 100 visningar från samma besökare
                  samma dag ignoreras. Det är därför inget cookie-meddelande behövs för mätningen.
                </p>
              </Prose>
            </SubSection>

            <SubSection id="trafik-steg" title="Slå på den — två rader">
              <Prose>
                <p>
                  <strong>1. Paketet</strong> måste vara 0.6 eller senare. <code>{INIT_COMMAND}</code> uppgraderar och
                  skapar routen i steg 2 om den saknas; befintliga filer skrivs inte över.
                </p>
              </Prose>
              <CodeBlock code={ANALYTICS_INSTALL} language="bash" maxHeight={null} />
              <Prose>
                <p>
                  <strong>2. Routen</strong> som tar emot sidvisningarna. Den lägger till IP, user agent och land från
                  anropet och skickar vidare till sitecms med <code>CMS_API_KEY</code>. Den svarar alltid{" "}
                  <code>204</code> till webbläsaren — även om sitecms inte svarar (en varning i serverloggen, högst en
                  per process) och även utan nyckel (då skickas inget vidare).
                </p>
              </Prose>
              <CodeBlock code={analyticsRouteSnippet()} filename={ANALYTICS_FILES.route} language="ts" maxHeight={null} />
              <Prose>
                <p>
                  <strong>3. Komponenten</strong>, sist i <code>&lt;body&gt;</code>. Den skickar en sidvisning vid
                  första laddningen och vid varje byte av sökväg (inte vid ändrad query eller hash), med{" "}
                  <code>sendBeacon</code> så att sidan aldrig väntar på den.
                </p>
              </Prose>
              <CodeBlock code={analyticsLayoutSnippet()} filename={ANALYTICS_FILES.layout} language="tsx" maxHeight={null} />
              <Prose>
                <p>
                  Deploya. Inga nya miljövariabler behövs. <strong>Inget skickas</strong> i förhandsgranskningen (draft
                  mode — komponenten renderar null, så panelens klick räknas aldrig), från <code>localhost</code> /{" "}
                  <code>127.0.0.1</code>, från automatiserade webbläsare (<code>navigator.webdriver</code>) eller för
                  samma sökväg två gånger i rad.
                </p>
                <p>
                  Egen sökväg för routen: <code>&lt;SitecmsAnalytics endpoint=&quot;/api/stats&quot; /&gt;</code>. Egna
                  värden i routen: <code>createAnalyticsRoute({`{ apiKey, apiUrl, site, fetch }`})</code> från{" "}
                  <code>sitecms-next/analytics</code>.
                </p>
              </Prose>
            </SubSection>

            <SubSection id="trafik-felsok" title="Felsökning">
              <DocTable
                head={["Det du ser", "Kontrollera"]}
                rows={[
                  [
                    "Ingen trafik ännu, trots besök",
                    <>
                      Öppna sajten och nätverksfliken i webbläsaren: en <code>POST {ANALYTICS_ROUTE_PATH}</code> ska
                      svara <code>204</code> vid varje sidbyte. <code>404</code> → routen saknas (kör{" "}
                      <code>{INIT_COMMAND}</code> igen eller skapa filen). Inget anrop alls →{" "}
                      <code>&lt;SitecmsAnalytics /&gt;</code> saknas i layouten, eller du besöker sajten på localhost
                      eller i förhandsgranskningen.
                    </>,
                  ],
                  [
                    "204 i nätverksfliken, men inget i panelen",
                    <>
                      <code>CMS_API_KEY</code> saknas hos webbhotellet (routen svarar 204 men skickar inget vidare),
                      eller hör till en annan sajt. Serverloggen visar då <code>sitecms: trafikpixeln fick 401 …</code>.
                      Kör <code>{NPM_CHECK}</code>.
                    </>,
                  ],
                  [
                    "Dina egna besök syns inte",
                    "Avsiktligt på localhost och i förhandsgranskningen. Besök från produktionsadressen räknas, även dina egna.",
                  ],
                  [
                    "Siffrorna ser låga ut",
                    "Robotar räknas inte, och besökare är unika per dag — inte sessioner. Dagarna räknas i UTC, så besök efter midnatt svensk tid hamnar på föregående dag.",
                  ],
                ]}
              />
            </SubSection>
          </Section>

          {/* SEO-poäng */}
          <Section
            id="seo-poang"
            eyebrow="Panelen"
            title="SEO-poäng"
            intro={
              <>
                Varje sajt får en poäng 0–100 under <strong>SEO &amp; Trafik</strong>, med en lista &quot;Att fixa&quot;
                där varje rad länkar till rätt ställe i panelen. Poängen räknas om varje natt och när kunden trycker på{" "}
                <strong>Räkna om</strong> (högst en gång per tio minuter).
              </>
            }
          >
            <Prose>
              <p>
                <strong>Så räknas den.</strong> Innehållspoängen väger 60 % och Googles PageSpeed-mätning 40 %. Saknar
                sajten domän, eller svarar inte Google, blir poängen innehållspoängen rakt av — kortet visar då
                &quot;Google-mätning körs varje natt&quot;.
              </p>
              <ul>
                <li>
                  <strong>Innehåll (60 %)</strong> — tolv regler på det som ligger i sitecms. Start 100, varje träff drar
                  poäng med ett tak per regel, golv 0. Räknas direkt, utan nätverk.
                </li>
                <li>
                  <strong>Google (40 %)</strong> — PageSpeed Insights för startsidan på mobil:{" "}
                  <code>SEO × 0,5 + Prestanda × 0,3 + Tillgänglighet × 0,2</code>. Hämtas en gång per natt, timeout
                  60 s.
                </li>
              </ul>
            </Prose>
            <DocTable
              head={["Regel", "Drar", "Tak"]}
              rows={[
                ["Sida saknar SEO-titel", "6 / sida", "18"],
                ["Sida saknar SEO-beskrivning", "6 / sida", "18"],
                ["Sida saknar SEO-inställningar helt", "4 / sida", "12"],
                ["Bild saknar alt-text", "2 / bild", "12"],
                ["Sida har under 300 ord text", "3 / sida", "9"],
                ["SEO-titel med fel längd (30–60 tecken)", "2 / sida", "8"],
                ["SEO-beskrivning med fel längd (70–155 tecken)", "2 / sida", "8"],
                ["Samma SEO-titel på flera sidor", "4 / dubblett", "8"],
                ["Inget inlägg publicerat på 90 dagar", "5", "5"],
                ["Startsidan saknar delningsbild (og-bild)", "4", "4"],
                ["Omslagsbild på inlägg utan alt-text", "1 / inlägg", "4"],
                ["Inga inlägg alls", "3", "3"],
              ]}
            />
            <Prose>
              <p>
                <strong>Vad kunden kan påverka</strong> är hela innehållsdelen: fylla i titel och beskrivning per sida
                med rätt längd, skriva alt-texter, ge tunna sidor mer text och publicera inlägg då och då. &quot;Att
                fixa&quot; visar de fem fynd som drar mest, med en <strong>Åtgärda</strong>-knapp till rätt vy.
                Google-delen styrs av hur sajten är byggd (laddtid, tillgänglighet, teknisk SEO) och är utvecklarens
                ansvar — se Lighthouse-värdena på kortet.
              </p>
              <p>
                Panelen behöver inga inställningar för detta. Kör du en egen installation av sitecms: nattjobbet är{" "}
                <code>GET /api/cron/daily</code> (Vercel Cron 03:15 UTC) och kräver <code>CRON_SECRET</code>;{" "}
                <code>PAGESPEED_API_KEY</code> är valfri och höjer Googles kvot.
              </p>
            </Prose>
          </Section>

          {/* AI */}
          <Section
            id="ai"
            eyebrow="AI-assistenter"
            title="Med en AI-assistent"
            intro={
              <>
                ChatGPT, Cursor och Claude känner inte alltid till sitecms-next och skriver då gärna en egen klient — som
                ofta gör att sajten måste deployas om för varje ändring. Ge assistenten den här prompten först.
              </>
            }
          >
            <CodeBlock code={aiPromptSnippet()} filename="Prompt" language="text" />
            <Prose>
              <p>
                Prompten innehåller ingen nyckel. Hela integrationen — init, klienten, config-formatet, REST-API:t,
                webhooken och vanliga misstag — finns i maskinläsbar form på{" "}
                <DocLink href="/llms.txt">{`${DEFAULT_CMS_URL}/llms.txt`}</DocLink>. Samma prompt finns under
                Integration i panelen.
              </p>
            </Prose>
          </Section>

          {/* Deploy hooks */}
          <Section
            id="deploy-hooks"
            eyebrow="Alla ramverk"
            title="Andra ramverk: deploy hooks"
            intro="Använder sajten inte Next.js, eller är den helt statisk? Låt webbhotellet bygga om sajten varje gång kunden sparar."
          >
            <Prose>
              <ol>
                <li>
                  Skapa en deploy hook (kallas build hook hos vissa) i webbhotellets inställningar. Du får en hemlig URL
                  som startar ett nytt bygge när den tar emot en <code>POST</code>. sitecms behandlar den som en
                  hemlighet — health-API:t och CLI:t visar den maskerad.
                </li>
                <li>
                  Klistra in URL:en som <strong>revalidate-URL</strong> under Integration i panelen och tryck på{" "}
                  <strong>Testa anslutningen</strong> — ett bygge ska starta.
                </li>
                <li>
                  Hämta innehållet från <DocLink href="#api">REST-API:t</DocLink> vid build, med <code>CMS_API_KEY</code>{" "}
                  som miljövariabel hos webbhotellet.
                </li>
              </ol>
              <p>
                sitecms skickar samma anrop som till en revalidate-route; hooken bryr sig inte om bodyn eller
                signaturen. Ändringen syns när bygget är klart, oftast inom någon minut. Fälten kan synkas med{" "}
                <code>{NPM_SYNC}</code> i vilket Node-projekt som helst, eller med <code>POST …/schema</code>.
              </p>
            </Prose>
            <DocTable
              head={["Webbhotell", "Heter"]}
              rows={DEPLOY_HOOK_HOSTS.map((h) => [h.name, h.term])}
            />
            <CodeBlock code={BUILD_FETCH_EXAMPLE} filename="Exempel" language="js" />
          </Section>

          {/* CLI */}
          <Section
            id="cli"
            eyebrow="Verktyg"
            title="CLI: sitecms-next"
            intro="Följer med paketet. Läser CMS_API_KEY (och valfria CMS_API_URL och SITE_URL) från miljön eller .env.local / .env."
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
                    <td className="px-4 py-2.5 align-top whitespace-nowrap"><code>sitecms-next init [nyckel]</code></td>
                    <td className="px-4 py-2.5">Kopplar projektet: verifierar nyckeln, sparar den i <code>.env.local</code>, installerar paketet, skapar revalidate-routen och <code>sitecms.config.ts</code>, lägger till prebuild och synkar. <code>--no-install</code> hoppar över installationen.</td>
                  </tr>
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
                    <td className="px-4 py-2.5">Låter bygget faila om <code>CMS_API_KEY</code> saknas (annars hoppas synken över med en varning).</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 align-top whitespace-nowrap"><code>--config &lt;fil&gt;</code></td>
                    <td className="px-4 py-2.5">Använd en annan config-fil.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 align-top whitespace-nowrap"><code>sitecms-next check</code></td>
                    <td className="px-4 py-2.5">Verifierar nyckeln och visar sajtens namn, senaste sync och webhook-status.</td>
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
                [<code key="su">siteUrl</code>, "string?", <>Sajtens publika https-adress. Fyller i revalidate-URL:en om den saknas (skriver aldrig över). Skickas automatiskt av <code>sitecms-next sync</code>.</>],
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
                Bas-URL: <code className="break-all font-mono text-sm">{BASE}</code>. Sajten avgörs av API-nyckeln. Alla
                svar är JSON (utom <code className="font-mono text-sm">events</code>, som svarar 204 utan body) och
                cachas inte av sitecms (
                <code className="break-words font-mono text-sm">Cache-Control: private, no-store</code>) — cacha på din
                sida med <code className="font-mono text-sm">next.tags</code>.
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
                <p>
                  De äldre adresserna med slug, <code className="break-all">{LEGACY_BASE}/…</code>, finns kvar och
                  svarar likadant — befintliga integrationer behöver inte ändras.
                </p>
              </Prose>
              <CodeBlock
                code={`curl -H "x-api-key: $CMS_API_KEY" ${BASE}/content`}
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
                <>
                <p>
                  Sajtens namn, alla sidor med block i ordning, synliga tjänster och SEO per sida. För richtext-block
                  finns färdig <code>html</code>; för bilder <code>alt</code>. <code>label</code> och{" "}
                  <code>description</code> kommer från schemat.
                </p>
                <p>
                  Med headern <code>x-sitecms-preview: &lt;token&gt;</code> (bara i{" "}
                  <DocLink href="#forhandsgranskning">förhandsgranskningen</DocLink>) innehåller svaret panelens osparade
                  värden — <code>value</code>, <code>alt</code> och omräknad <code>html</code> — och{" "}
                  <code>{`"preview": true`}</code>. Ogiltig eller utgången token ger <code>401</code> med{" "}
                  <code>{`"code": "preview_invalid"`}</code>. Utan headern är svaret oförändrat.
                </p>
                </>
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
                  <code>Content-Type: application/json</code>, och valfritt <code>siteUrl</code>. Svaret berättar vad som
                  skapades, uppdaterades och (med <code>prune</code>) togs bort, samt sajtens <code>revalidateUrl</code>.
                  Uppdaterar &quot;Senaste schema-sync&quot; i panelen.
                </p>
              }
            >
              <CodeBlock
                code={`curl -X POST ${BASE}/schema \\
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
              title="Kontrollera nyckeln och webhooken"
              description={
                <p>
                  Snabb kontroll av att nyckeln stämmer, utan att hämta innehåll. Visar också revalidate-URL:en och hur
                  det senaste webhook-anropet gick (<code>lastStatus</code> är <code>ok</code>, <code>failed</code>{" "}
                  eller <code>null</code>). Bra i CI och för övervakning. En revalidate-URL med annan sökväg än{" "}
                  <code>/api/sitecms/revalidate</code> (t.ex. en deploy hook) visas maskerad som{" "}
                  <code>https://värd/••••</code>.
                </p>
              }
            >
              <CodeBlock code={healthCurlSnippet(ctx)} language="bash" maxHeight={null} />
              <CodeBlock code={HEALTH_RESPONSE} filename="200 OK" language="json" maxHeight={null} />
            </Endpoint>

            <Endpoint
              id="api-preview"
              method="GET"
              path={`${BASE}/preview`}
              title="Verifiera en förhandsgranskning"
              description={
                <p>
                  Används av kundsajtens preview-route (<code>sitecms-next/preview</code>) innan draft mode slås på.
                  Headers: <code>x-api-key</code> och <code>x-sitecms-preview</code>. <code>panelOrigin</code> är den
                  enda origin sajten ska ta emot meddelanden från. Fel eller utgången token, eller en token för en annan
                  sajt, ger <code>401</code> med <code>preview_invalid</code>.
                </p>
              }
            >
              <CodeBlock code={PREVIEW_VERIFY_RESPONSE} filename="200 OK" language="json" maxHeight={null} />
              <CodeBlock code={PREVIEW_INVALID_RESPONSE} filename="401 Unauthorized" language="json" maxHeight={null} />
            </Endpoint>

            <Endpoint
              id="api-quote-requests"
              method="POST"
              path={`${BASE}/quote-requests`}
              title="Skicka en offertförfrågan"
              description={
                <>
                  <p>
                    Tar emot en förfrågan från sajtens formulär (server-till-server, <code>Content-Type: application/json</code>),
                    validerar alla fält igen, sparar den under Förfrågningar i panelen och mejlar företaget (svar-till
                    kunden) samt ett kvitto till kunden. Svaret är <code>201</code> även om mejlen misslyckas —{" "}
                    <code>emailStatus</code> berättar hur det gick (<code>sent</code>, <code>failed</code> eller{" "}
                    <code>skipped</code> när <strong>E-post för förfrågningar</strong> inte är ifylld under Inställningar).
                    Bilagor laddas upp först via{" "}
                    <DocLink href="#api-quote-attachments">quote-requests/attachments</DocLink>. Enklast med{" "}
                    <DocLink href="#kod-quote">sitecms-next</DocLink>.
                  </p>
                  <p>
                    <strong>Rate limit:</strong> 5 förfrågningar per timme och <code>ipHash</code> (per sajt) →{" "}
                    <code>429</code>. Utan <code>ipHash</code> ingen rate limit — skicka den. <strong>Retention:</strong>{" "}
                    förfrågningar och deras bilagor raderas automatiskt efter 12 månader (GDPR); kunden kan radera tidigare i
                    panelen. IP-adressen lagras aldrig, bara sajtens saltade hash.
                  </p>
                </>
              }
            >
              <DocTable
                head={["Fält", "Typ", "Krav"]}
                rows={[
                  [<code key="name">name</code>, "string", "Krävs. 2–100 tecken."],
                  [<code key="phone">phone</code>, "string", "Krävs. Svenskt telefonnummer (normaliseras till +46…)."],
                  [<code key="email">email</code>, "string", "Krävs. Giltig e-postadress, max 200 tecken."],
                  [<code key="jobType">jobType</code>, "string", "Krävs. Typ av uppdrag, max 100 tecken."],
                  [<code key="description">description</code>, "string", "Krävs. 10–3000 tecken."],
                  [<code key="consent">consent</code>, "boolean", "Krävs. Måste vara true (kunden har godkänt behandlingen)."],
                  [<code key="company">company</code>, "string | null", "Valfri. Max 100 tecken."],
                  [<code key="machine">machine</code>, "string | null", "Valfri. Max 100 tecken."],
                  [<code key="location">location</code>, "string | null", "Valfri. Plats/ort, max 100 tecken."],
                  [<code key="desiredStart">desiredStart</code>, "string | null", "Valfri. YYYY-MM-DD, inte bakåt i tiden."],
                  [<code key="customerType">customerType</code>, <>&quot;privat&quot; | &quot;foretag&quot; | null</>, "Valfri."],
                  [<code key="budget">budget</code>, "string | null", "Valfri. Fritext/intervall, max 100 tecken."],
                  [<code key="rot">rot</code>, "boolean | null", "Valfri. Vill använda ROT-avdrag (även \"true\"/\"false\", \"ja\"/\"nej\")."],
                  [<code key="postalCode">postalCode</code>, "string | null", "Valfri. Max 10 tecken."],
                  [<code key="source">source</code>, "string | null", "Valfri. Leadkälla (utm/referrer-sträng), max 500 tecken."],
                  [<code key="attachments">attachments</code>, <>{"{ url, name, contentType, size }"}[] | null</>, "Valfri. Max 10 st. url: https, max 2048 tecken (från upload-endpointen)."],
                  [<code key="extra">extra</code>, <>{"Record<string, string>"} | null</>, <>Valfri. Egna fält: nyckel <code>^[a-zA-Z0-9_.-]{"{1,50}"}$</code>, värde max 500 tecken, tomma värden kastas, max 20 nycklar. Visas som tabell i panelen.</>],
                  [<code key="ipHash">ipHash</code>, "string | null", "Valfri men rekommenderad. Hex 16–128 tecken, saltad SHA-256 av avsändarens IP (hashIp i sitecms-next). Används bara för rate limit."],
                ]}
              />
              <CodeBlock code={quoteRequestCurlSnippet(ctx)} language="bash" maxHeight={null} />
              <CodeBlock code={QUOTE_REQUEST_BODY} filename="forfragan.json" language="json" />
              <CodeBlock code={QUOTE_REQUEST_RESPONSE} filename="201 Created" language="json" maxHeight={null} />
              <CodeBlock code={QUOTE_REQUEST_400} filename="400 Bad Request" language="json" maxHeight={null} />
              <CodeBlock code={QUOTE_REQUEST_429} filename="429 Too Many Requests" language="json" maxHeight={null} />
            </Endpoint>

            <Endpoint
              id="api-quote-attachments"
              method="POST"
              path={`${BASE}/quote-requests/attachments`}
              title="Ladda upp en bilaga"
              description={
                <>
                  <p>
                    <code>multipart/form-data</code> med fältet <code>file</code> (JPG, PNG, WEBP, HEIC eller PDF, max 10 MB —
                    filtypen avgörs av innehållet, inte filändelsen) och valfritt <code>ipHash</code>. Filen lagras på en
                    publik men ogissbar adress och svaret är exakt det objekt som skickas i <code>attachments</code> på
                    förfrågan. Ladda upp bilagorna först, skicka sedan förfrågan — uppladdningar som inte bifogats någon
                    förfrågan inom ett dygn raderas.
                  </p>
                  <p>
                    <strong>Rate limit:</strong> 30 uppladdningar per timme och <code>ipHash</code> (per sajt); utan{" "}
                    <code>ipHash</code> delar hela sajten en hink på 200/h. För stor fil → <code>413</code>, fel filtyp →{" "}
                    <code>400</code>, för många → <code>429</code>. Bilagorna raderas tillsammans med förfrågan (manuellt
                    eller efter 12 månader).
                  </p>
                </>
              }
            >
              <CodeBlock code={quoteAttachmentCurlSnippet(ctx)} language="bash" maxHeight={null} />
              <CodeBlock code={QUOTE_ATTACHMENT_RESPONSE} filename="201 Created" language="json" maxHeight={null} />
            </Endpoint>

            <Endpoint
              id="api-events"
              method="POST"
              path={`${BASE}/events`}
              title="Registrera sidvisningar"
              description={
                <>
                  <p>
                    Tar emot sidvisningar från kundsajtens events-route (<code>sitecms-next/analytics</code>,
                    server-till-server med <code>Content-Type: application/json</code>) och uppdaterar dagssummorna
                    som visas under <DocLink href="#trafik">Trafik</DocLink>. Normalt anropar du inte den själv —
                    routen i paketet gör det. Anropa den direkt om sajten inte är byggd i Next.js: skicka då med{" "}
                    <code>ua</code> och <code>ip</code> från besökarens anrop, annars räknas alla besökare som en.
                  </p>
                  <p>
                    Svaret är alltid <code>204</code> utan body när anropet är giltigt — även när alla events
                    filtrerats bort som robotar. <code>ip</code> och <code>ua</code> används bara för att räkna unika
                    besökare (dagsbunden hash) och lagras aldrig.
                  </p>
                </>
              }
            >
              <DocTable
                head={["Fält", "Typ", "Krav"]}
                rows={[
                  [<code key="events">events</code>, "objekt[]", "Krävs. 1–20 events. Hela bodyn max 4 kB."],
                  [<code key="p">p</code>, "string", <>Krävs. Sökväg eller full URL, max 2048 tecken. Normaliseras till pathname utan query/hash, max 200 tecken.</>],
                  [<code key="r">r</code>, "string", <>Valfri. Referer (<code>document.referrer</code>). Egen domän räknas som <code>direkt</code>.</>],
                  [<code key="q">q</code>, "string", <>Valfri. Querysträng utan <code>?</code>; bara <code>utm_source</code> används (→ källan <code>utm:…</code>).</>],
                  [<code key="ua">ua</code>, "string", "Valfri men viktig. Besökarens user agent — tom eller robotlik UA ignoreras tyst."],
                  [<code key="ip">ip</code>, "string", <>Valfri. Besökarens IP (första i <code>x-forwarded-for</code>). Saknas den används anropets IP.</>],
                  [<code key="c">c</code>, "string", <>Valfri. Landskod (ISO 3166-1 alpha-2), t.ex. från <code>x-vercel-ip-country</code>. Annars <code>ZZ</code>.</>],
                  [<code key="t">t</code>, "number", "Valfri. Tidsstämpel i ms — tas emot men används inte; dagen är alltid serverns UTC-dag."],
                ]}
              />
              <CodeBlock code={eventsBodyExample()} filename="Body" language="json" maxHeight={null} />
              <CodeBlock code={eventsCurlSnippet(ctx)} language="bash" maxHeight={null} />
              <CodeBlock code={`HTTP/1.1 204 No Content\nCache-Control: private, no-store`} filename="204 No Content" language="http" maxHeight={null} />
              <CodeBlock code={EVENTS_400_RESPONSE} filename="400 Bad Request" language="json" maxHeight={null} />
              <CodeBlock code={EVENTS_429_RESPONSE} filename="429 Too Many Requests" language="json" maxHeight={null} />
              <Prose>
                <p>
                  <strong>Gränser:</strong> 600 events per minut och sajt → <code>429</code>. Body över 4 kB →{" "}
                  <code>413</code>. Ogiltig JSON, fel typ på ett fält eller fler än 20 events → <code>400</code>. Fel
                  nyckel → <code>401</code>. Högst 100 visningar per besökare och dag räknas; resten ignoreras tyst.
                  Robotfiltret matchar user agents med <code>bot</code>, <code>crawl</code>, <code>spider</code>,{" "}
                  <code>headless</code>, <code>lighthouse</code>, <code>curl</code>, <code>python</code> m.fl.
                </p>
              </Prose>
            </Endpoint>

            <Card id="api-webhook" className="scroll-mt-28">
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold tracking-tight">Webhook (sitecms → din sajt)</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <MethodBadge method="POST" />
                    <code className="break-all font-mono text-sm text-neutral-800">
                      https://din-domän.se{REVALIDATE_ROUTE_PATH}
                    </code>
                  </div>
                </div>
                <Prose>
                  <p>
                    Varje gång innehåll sparas i panelen skickar sitecms en <code>POST</code> till sajtens
                    revalidate-URL (timeout 5 s, inga omförsök). <strong>Testa anslutningen</strong> skickar exakt samma
                    anrop (timeout 8 s). Resultatet — ok eller misslyckat, tid och felorsak — visas under Integration och
                    i <DocLink href="#api-health">health</DocLink>.
                  </p>
                </Prose>
                <CodeBlock code={WEBHOOK_HEADERS} filename="Anrop" language="http" maxHeight={null} />
                <Prose>
                  <p>
                    <strong>Signaturen.</strong> <code>x-sitecms-signature</code> innehåller en <code>v1=</code>-post per
                    API-nyckel som sajten har (sitecms vet inte vilken nyckel din sajt använder). Varje post är
                  </p>
                  <ul>
                    <li>
                      HMAC-SHA256 med <strong>nyckeln</strong> = UTF-8-strängen <code>sha256hex(CMS_API_KEY)</code>{" "}
                      (64 hextecken, gemener),
                    </li>
                    <li>
                      över <strong>meddelandet</strong> <code>{"`${timestamp}.${rawBody}`"}</code> — tidsstämpeln från{" "}
                      <code>x-sitecms-timestamp</code>, en punkt och exakt den mottagna bodyn,
                    </li>
                    <li>som hex.</li>
                  </ul>
                  <p>
                    Godkänn anropet om någon <code>v1</code>-post matchar (jämför i konstant tid) och tidsstämpeln avviker
                    högst 300 sekunder från klockan. Svara <code>2xx</code> när det stämmer och <code>401</code> annars.
                    Läs bodyn som text innan du tolkar den — signaturen gäller de exakta bytes som skickades.
                  </p>
                  <p>
                    Har sajten en revalidate-hemlighet (äldre integrationer) innehåller bodyn även{" "}
                    <code>{`"secret"`}</code>, och mottagare som jämför den mot <code>CMS_REVALIDATE_SECRET</code>{" "}
                    fortsätter fungera. Ange den slutliga adressen — en omdirigering med 301/302 gör om anropet till GET.
                    Högst 3 omdirigeringar följs, och adresser som pekar på interna nät (localhost, privata IP-adresser)
                    avvisas.
                  </p>
                  <p>
                    <strong>Säkerhet.</strong> HMAC-nyckeln är <code>sha256hex(CMS_API_KEY)</code> — det värde som
                    sitecms lagrar (aldrig själva nyckeln). Den som kan läsa sitecms databas kan alltså signera
                    webhooks, men inte hämta innehåll med nyckeln. Ett uppfångat anrop kan spelas upp igen inom 300
                    sekunder; det ger bara en extra revalidering av samma innehåll. Deploy hook-URL:er behandlas som
                    hemligheter: API:t och CLI:t visar bara <code>https://värd/••••</code> för andra adresser än{" "}
                    <code>/api/sitecms/revalidate</code>.
                  </p>
                </Prose>
                <CodeBlock code={SIGNATURE_NODE} filename="Verifiera i Node (utan paketet)" language="ts" maxHeight={null} />
                <Prose>
                  <p>Skicka en korrekt signerad test-webhook från terminalen (bash + openssl):</p>
                </Prose>
                <CodeBlock code={signedWebhookCurlSnippet()} language="bash" maxHeight={null} />
                <CodeBlock code={`{ "revalidated": true }`} filename="200 OK" language="json" maxHeight={null} />
              </CardContent>
            </Card>

            <SubSection id="api-verifiera" title={<code className="font-mono">verifyWebhook()</code>}>
              <Prose>
                <p>
                  <code>sitecms-next/revalidate</code> gör allt ovan. Behöver du en egen route-handler — för att tömma
                  fler taggar eller sökvägar, eller i en Express- eller Edge-miljö — finns samma kontroll som{" "}
                  <code>verifyWebhook()</code> i huvudpaketet. Den returnerar <code>true</code> om signaturen stämmer med{" "}
                  <code>CMS_API_KEY</code>, eller om bodyns <code>secret</code> matchar <code>CMS_REVALIDATE_SECRET</code>.
                </p>
              </Prose>
              <CodeBlock code={npmVerifyWebhookSnippet()} filename={SNIPPET_FILES.revalidate} language="ts" maxHeight={null} />
              <DocTable
                head={["Alternativ", "Typ", "Beskrivning"]}
                rows={[
                  [<code key="r">rawBody</code>, "string | Uint8Array | ArrayBuffer", "Exakt den mottagna bodyn."],
                  [<code key="h">headers</code>, "Headers | objekt", <>Request-headers, t.ex. <code>request.headers</code> eller <code>req.headers</code> i Express.</>],
                  [<code key="k">apiKey</code>, "string?", <>Default <code>process.env.CMS_API_KEY</code>.</>],
                  [<code key="l">legacySecret</code>, "string?", <>Default <code>process.env.CMS_REVALIDATE_SECRET</code>. Tom sträng stänger av.</>],
                  [<code key="t">toleranceSeconds</code>, "number?", "Default 300."],
                ]}
              />
            </SubSection>

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
                  [<code key="400">400</code>, "Ogiltig förfrågan", <>Schemat följer inte formatet (fel slug/key, okänd typ, fler än 100 sidor eller 200 block per sida), eller body är inte giltig JSON. Se <code>issues</code>. För offertförfrågningar: fältfel i <code>fields</code> (fältnamn → svenskt meddelande), eller en bilaga med fel filtyp. För events: <code>events</code> saknas, är tom eller har fler än 20 objekt, eller ett event saknar <code>p</code>.</>],
                  [<code key="401">401</code>, "Nyckel saknas eller är fel", <>Headern <code>x-api-key</code> saknas eller nyckeln är borttagen (med slug-adresserna även: nyckeln hör till en annan sajt).</>],
                  [<code key="401p">401</code>, <><code>preview_invalid</code></>, <>Token i <code>x-sitecms-preview</code> är fel, har gått ut eller hör till en annan sajt. Kundsajten ska då visa vanligt innehåll.</>],
                  [<code key="404">404</code>, "Hittades inte", "Inlägget finns inte eller är inte publicerat (med slug-adresserna även: okänd sajt-slug)."],
                  [<code key="413">413</code>, "För stort", "Request-bodyn är för stor för att tas emot. Kontrollera att schemat inte innehåller stora default-värden (t.ex. base64-bilder i stället för URL:er). För bilagor: filen är större än 10 MB. För events: bodyn är över 4 kB."],
                  [<code key="429">429</code>, "För många anrop", <>Rate limit för offertförfrågningar (5/h per <code>ipHash</code>), bilagor (30/h per <code>ipHash</code>) eller events (600/min per sajt). Meddelandet i <code>error</code> är på svenska och kan visas för kunden.</>],
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
                repo. Kräver bara <code className="font-mono text-sm">CMS_API_KEY</code> och inga beroenden utöver{" "}
                <code className="font-mono text-sm">tsx</code> för synkskriptet.
              </>
            }
          >
            <SubSection id="kod-klient" title={<code className="break-all font-mono">{SNIPPET_FILES.client}</code>}>
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

            <SubSection id="kod-revalidate" title={<code className="break-all font-mono">{SNIPPET_FILES.revalidate}</code>}>
              <Prose>
                <p>
                  Tar emot webhooken, verifierar <DocLink href="#api-webhook">signaturen</DocLink> med Web Crypto
                  (fungerar i Node och Edge) och tömmer cachetaggen. Godtar även en äldre{" "}
                  <code>CMS_REVALIDATE_SECRET</code> om den är satt.
                </p>
              </Prose>
              <CodeBlock code={revalidateRouteSnippet()} filename={SNIPPET_FILES.revalidate} language="ts" />
            </SubSection>

            <SubSection id="kod-config" title={<code className="break-all font-mono">{SNIPPET_FILES.config}</code>}>
              <Prose>
                <p>
                  Typad deklaration av sidor och fält. Formatet beskrivs under <DocLink href="#schema">Schema-format</DocLink>.
                </p>
              </Prose>
              <CodeBlock code={configSnippet(ctx)} filename={SNIPPET_FILES.config} language="ts" />
            </SubSection>

            <SubSection id="kod-sync" title={<code className="break-all font-mono">{SNIPPET_FILES.sync}</code>}>
              <Prose>
                <p>
                  Läser <code>{SNIPPET_FILES.config}</code>, POST:ar den till <code>…/schema</code> och skriver ut vad som
                  skapades, uppdaterades och vilka fält som bara finns i CMS:et. Avslutar med felkod 1 vid fel, så att
                  bygget stoppas innan en trasig struktur går ut. Saknas <code>CMS_API_KEY</code> hoppas synken över med
                  en varning (<code>--strict</code> stoppar bygget i stället).
                </p>
              </Prose>
              <CodeBlock code={syncScriptSnippet(ctx)} filename={SNIPPET_FILES.sync} language="ts" />
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

          {/* Uppgradera */}
          <Section
            id="uppgradera"
            eyebrow="Befintliga sajter"
            title="Uppgradera från 0.2"
            intro={
              <>
                Sajter som kopplades med sitecms-next 0.2 eller den tidigare copy-paste-koden fortsätter fungera utan
                ändringar: slug-adresserna finns kvar och webhooken skickar fortfarande <code>secret</code> i bodyn. Med
                0.3 räcker en variabel.
              </>
            }
          >
            <DocTable
              head={["Variabel", "0.2", "0.3"]}
              rows={[
                [<code key="k">CMS_API_KEY</code>, "Krävs", "Krävs — den enda"],
                [<code key="u">CMS_API_URL</code>, "Krävs", <>Valfri, default <code>{DEFAULT_CMS_URL}</code></>],
                [<code key="s">CMS_SITE</code>, "Krävs", "Valfri — satt ger de gamla slug-adresserna"],
                [<code key="r">CMS_REVALIDATE_SECRET</code>, "Krävs", "Valfri — godtas fortfarande om den är satt"],
              ]}
            />
            <Prose>
              <ol>
                <li>
                  Uppgradera paketet och deploya, med de gamla variablerna kvar. Allt fungerar som förut.
                  <br />
                  <code>{NPM_UPGRADE}</code> — eller <code>{INIT_COMMAND}</code>, som uppgraderar paketet och lägger till
                  det som saknas utan att skriva över befintliga filer.
                </li>
                <li>
                  Ta bort <code>CMS_SITE</code>, <code>CMS_REVALIDATE_SECRET</code> och <code>CMS_API_URL</code> (om den
                  pekar på sitecms.se eller sitecms-zeta.vercel.app) från <code>.env.local</code> och hos webbhotellet,
                  och deploya igen.
                </li>
                <li>
                  Tryck på <strong>Testa anslutningen</strong> under Integration. Revalidate-hemligheten i panelen kan
                  ligga kvar — den skadar inte.
                </li>
              </ol>
              <p>
                Ordningen är viktig: tar du bort <code>CMS_REVALIDATE_SECRET</code> medan sajten fortfarande kör 0.2
                avvisas webhooken. Använder du copy-paste-koden byter du{" "}
                <DocLink href="#kod-klient">{SNIPPET_FILES.client}</DocLink> och{" "}
                <DocLink href="#kod-revalidate">revalidate-routen</DocLink> mot de nya versionerna, eller kör init.
              </p>
            </Prose>
            <Prose>
              <p>De fyra variablerna som äldre integrationer använder, för referens:</p>
            </Prose>
            <CodeBlock code={legacyEnvSnippet(ctx)} filename={SNIPPET_FILES.env} language="env" maxHeight={null} />
            <Prose>
              <p>Den äldre formen av webhooken (hemligheten i bodyn):</p>
            </Prose>
            <CodeBlock code={revalidateCurlSnippet()} language="bash" maxHeight={null} />
          </Section>

          <aside className="relative isolate overflow-hidden rounded-2xl border border-white/10 bg-space-900 p-6 text-ink shadow-[0_30px_80px_-40px_rgba(4,6,15,0.8)] sm:p-8">
            <div aria-hidden className="sc-stars pointer-events-none absolute inset-0 -z-10 opacity-40" />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_140%_at_50%_0%,rgba(93,240,168,0.12),transparent_55%)]"
            />
            <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-extrabold tracking-[-0.02em] sm:text-2xl">
                  Redo att koppla din första sajt?
                </h2>
                <p className="mt-1 text-sm text-ink-muted">Skapa ett konto — sedan är det ett kommando.</p>
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
