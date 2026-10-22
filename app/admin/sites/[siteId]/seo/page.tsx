import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { ArrowRight, BarChart3, CircleCheck, Plus, RefreshCw, Search } from "lucide-react";
import { db, seoMeta, sites } from "@/lib/db";
import { requireSiteAccessWithRole } from "@/lib/guard";
import { createSeoMeta, runSeoScoreNow } from "@/lib/actions/seo";
import { displayDomain } from "@/lib/site-url";
import { cn } from "@/lib/cn";
import { formatDateTime, formatNumber, formatPercentChange, relativeTime } from "@/lib/format";
import { getTrafficBreakdown, getTrafficSummary, type TrafficBreakdownRow, type TrafficSummary } from "@/lib/traffic";
import { getLatestSeoScore, loadContentInput, scoreContent, type Finding, type SeoScore } from "@/lib/seo-score";
import { CodeBlock } from "@/components/admin/CodeBlock";
import { ScoreRing, scoreLabel } from "@/components/admin/ScoreRing";
import { TrafficChart } from "@/components/admin/TrafficChart";
import { countryFlag, countryName, deviceLabel, pathLabel, sourceLabel } from "@/components/admin/traffic-labels";
import {
  Alert,
  Badge,
  ButtonLink,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  Input,
  PageHeader,
  SubmitButton,
} from "@/components/ui";

/** "Räkna om" kör PageSpeed och kan ta upp till 60 s (docs/SEO-TRAFIK.md §6). */
export const maxDuration = 90;

const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 160;
const MAX_FINDINGS = 5;
const TOP_N = 8;

type Period = 7 | 30;

const SCORE_FLASH: Record<string, { tone: "success" | "info" | "danger"; text: string }> = {
  ok: { tone: "success", text: "Poängen är uppdaterad." },
  recent: { tone: "info", text: "Nyss beräknad – vänta 10 minuter innan du räknar om igen." },
  failed: { tone: "danger", text: "Kunde inte räkna om – försök igen." },
};

const ANALYTICS_SNIPPET = `export { POST } from "sitecms-next/analytics";   // app/api/sitecms/events/route.ts
<SitecmsAnalytics />                                // sist i <body> i app/layout.tsx`;

function lengthTone(length: number, limit: number) {
  return length > 0 && length <= limit ? "success" : "warning";
}

/** Poängkortets data: sparad rad, eller innehållspoäng räknad direkt när ingen rad finns. */
type ScoreView =
  | { kind: "stored"; score: SeoScore }
  | { kind: "live"; score: number; findings: Finding[] }
  | { kind: "unavailable" };

async function loadScore(siteId: string): Promise<ScoreView> {
  try {
    const stored = await getLatestSeoScore(siteId);
    if (stored) return { kind: "stored", score: stored };
  } catch (err) {
    console.error(`seo/page: kunde inte läsa seo_scores för ${siteId}`, err);
  }
  try {
    const live = scoreContent(await loadContentInput(siteId));
    return { kind: "live", score: live.score, findings: live.findings };
  } catch (err) {
    console.error(`seo/page: kunde inte räkna innehållspoäng för ${siteId}`, err);
    return { kind: "unavailable" };
  }
}

type TrafficView = {
  summary: TrafficSummary;
  paths: TrafficBreakdownRow[];
  sources: TrafficBreakdownRow[];
  countries: TrafficBreakdownRow[];
  devices: TrafficBreakdownRow[];
} | null;

async function loadTraffic(siteId: string, period: Period): Promise<TrafficView> {
  try {
    const summary = await getTrafficSummary(siteId, period);
    if (!summary.hasData) return { summary, paths: [], sources: [], countries: [], devices: [] };
    const [paths, sources, countries, devices] = await Promise.all([
      getTrafficBreakdown(siteId, period, "path", TOP_N),
      getTrafficBreakdown(siteId, period, "source", TOP_N),
      getTrafficBreakdown(siteId, period, "country", TOP_N),
      getTrafficBreakdown(siteId, period, "device", TOP_N),
    ]);
    return { summary, paths, sources, countries, devices };
  } catch (err) {
    console.error(`seo/page: kunde inte läsa trafik för ${siteId}`, err);
    return null;
  }
}

export default async function SeoListPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ period?: string; score?: string }>;
}) {
  const { siteId } = await params;
  const { isOwner } = await requireSiteAccessWithRole(siteId);
  const { period: periodParam, score: scoreParam } = await searchParams;
  const period: Period = periodParam === "30" ? 30 : 7;

  const [rows, [site], scoreView, traffic] = await Promise.all([
    db.select().from(seoMeta).where(eq(seoMeta.siteId, siteId)).orderBy(asc(seoMeta.pageSlug)),
    db.select({ name: sites.name, domain: sites.domain }).from(sites).where(eq(sites.id, siteId)).limit(1),
    loadScore(siteId),
    loadTraffic(siteId, period),
  ]);

  const base = `/admin/sites/${siteId}`;
  const host = displayDomain(site?.domain) || "din-sajt.se";
  const siteName = site?.name ?? "";
  const initial = (siteName.trim()[0] ?? host[0] ?? "?").toUpperCase();
  const flash = scoreParam ? SCORE_FLASH[scoreParam] : undefined;

  const findings: Finding[] =
    scoreView.kind === "stored" ? scoreView.score.findings : scoreView.kind === "live" ? scoreView.findings : [];
  const topFindings = [...findings].sort((a, b) => b.points - a.points).slice(0, MAX_FINDINGS);

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0"
        title="SEO & Trafik"
        description="Hur sajten mår i Google, vilka som besöker den och vad du kan förbättra."
      />

      {flash ? <Alert tone={flash.tone}>{flash.text}</Alert> : null}

      {/* 1. Poängkort */}
      <Card>
        <CardHeader
          actions={
            isOwner ? (
              <form action={runSeoScoreNow.bind(null, siteId)}>
                <SubmitButton variant="secondary" size="sm" icon={<RefreshCw />} pendingText="Räknar…">
                  Räkna om
                </SubmitButton>
              </form>
            ) : null
          }
        >
          <CardTitle>SEO-poäng</CardTitle>
          <CardDescription>Innehållet i panelen väger 60 %, Googles mätning av sajten 40 %.</CardDescription>
        </CardHeader>
        <CardContent>
          {scoreView.kind === "unavailable" ? (
            <p className="text-sm text-neutral-500">Poängen kunde inte beräknas just nu. Försök igen om en stund.</p>
          ) : (
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
              <ScoreRing score={scoreView.kind === "stored" ? scoreView.score.score : scoreView.score} />
              <div className="min-w-0 flex-1 space-y-3">
                <p className="text-sm font-medium text-neutral-900">
                  {scoreLabel(scoreView.kind === "stored" ? scoreView.score.score : scoreView.score)}
                  <span className="font-normal text-neutral-500"> · av 100 möjliga</span>
                </p>
                <dl className="grid grid-cols-2 gap-3 sm:max-w-sm">
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
                    <dt className="text-xs text-neutral-500">Innehåll</dt>
                    <dd className="text-lg font-semibold tabular-nums text-neutral-900">
                      {scoreView.kind === "stored" ? scoreView.score.contentScore : scoreView.score}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
                    <dt className="text-xs text-neutral-500">Google (Lighthouse)</dt>
                    <dd className="text-lg font-semibold tabular-nums text-neutral-900">
                      {scoreView.kind === "stored" && scoreView.score.lighthouseScore !== null ? (
                        scoreView.score.lighthouseScore
                      ) : (
                        <span className="text-neutral-400">–</span>
                      )}
                    </dd>
                  </div>
                </dl>
                <p className="text-xs text-neutral-500">
                  {scoreView.kind === "stored" ? (
                    <>
                      Beräknad{" "}
                      <time
                        dateTime={scoreView.score.createdAt.toISOString()}
                        title={formatDateTime(scoreView.score.createdAt)}
                      >
                        {relativeTime(scoreView.score.createdAt)}
                      </time>
                      {scoreView.score.lighthouseScore === null ? " · Google-mätning saknas för den här körningen" : null}
                    </>
                  ) : (
                    "Google-mätning körs varje natt"
                  )}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Att fixa */}
      <Card>
        <CardHeader>
          <CardTitle>Att fixa</CardTitle>
          <CardDescription>Det som drar ned poängen mest, i ordning.</CardDescription>
        </CardHeader>
        <CardContent>
          {topFindings.length === 0 ? (
            <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
              <CircleCheck aria-hidden className="size-4 shrink-0 text-emerald-600" />
              Allt ser bra ut – inget att åtgärda just nu.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {topFindings.map((finding) => (
                <li key={finding.id} className="flex flex-wrap items-start gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0">
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold tabular-nums",
                      finding.severity === "high"
                        ? "bg-red-50 text-red-700"
                        : finding.severity === "medium"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-neutral-100 text-neutral-600",
                    )}
                  >
                    −{finding.points}
                  </span>
                  <span className="min-w-0 flex-1 basis-48">
                    <span className="block text-sm text-neutral-900">{finding.title}</span>
                    {finding.detail ? <span className="mt-0.5 block text-xs text-neutral-500">{finding.detail}</span> : null}
                  </span>
                  {finding.href ? (
                    <ButtonLink href={`${base}${finding.href}`} variant="secondary" size="sm">
                      Åtgärda
                    </ButtonLink>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 3. Trafik */}
      <section aria-labelledby="trafik-rubrik" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="trafik-rubrik" className="text-base font-semibold text-neutral-900">
              Trafik
            </h2>
            <p className="text-sm text-neutral-500">Egen mätning utan cookies – inga besökare spåras.</p>
          </div>
          {traffic?.summary.hasData ? (
            <nav aria-label="Period" className="flex gap-1 rounded-lg border border-neutral-200 bg-white p-0.5">
              {([7, 30] as Period[]).map((days) => (
                <Link
                  key={days}
                  href={`${base}/seo${days === 7 ? "" : "?period=30"}`}
                  scroll={false}
                  aria-current={period === days ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50",
                    period === days ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100",
                  )}
                >
                  {days} dagar
                </Link>
              ))}
            </nav>
          ) : null}
        </div>

        {traffic === null ? (
          <Alert tone="warning">Trafiken kunde inte läsas just nu. Ladda om sidan om en stund.</Alert>
        ) : !traffic.summary.hasData ? (
          <EmptyState
            icon={<BarChart3 />}
            title="Ingen trafik ännu"
            description="Lägg till två rader i sajtens kod så börjar besöken räknas – cookiefritt och utan samtyckesruta."
            className="px-4 sm:px-6"
            action={
              <div className="w-full max-w-xl space-y-3 text-left">
                <CodeBlock code={ANALYTICS_SNIPPET} language="tsx" maxHeight={null} />
                <p className="text-center text-sm">
                  <Link
                    href="/docs#trafik"
                    className="inline-flex items-center gap-1 rounded-md font-medium text-brand-700 underline-offset-2 hover:text-brand-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2"
                  >
                    Så fungerar trafikmätningen
                    <ArrowRight aria-hidden className="size-4" />
                  </Link>
                </p>
              </div>
            }
          />
        ) : (
          <TrafficSection traffic={traffic} period={period} />
        )}
      </section>

      {/* 4. Befintlig SEO-lista */}
      <section aria-labelledby="seo-lista-rubrik" className="space-y-4">
        <div>
          <h2 id="seo-lista-rubrik" className="text-base font-semibold text-neutral-900">
            Så visas sidorna i Google
          </h2>
          <p className="text-sm text-neutral-500">Titel och beskrivning per sida.</p>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={<Search />}
            title="Ingen SEO-information ännu"
            description="Lägg till en sida nedan för att styra hur den visas i Google."
          />
        ) : (
          <ul className="space-y-3">
            {rows.map((entry) => {
              const title = entry.title?.trim() ?? "";
              const description = entry.description?.trim() ?? "";
              const path = entry.pageSlug.replace(/^\/+/, "");

              return (
                <li key={entry.id}>
                  <Link
                    href={`${base}/seo/${entry.id}`}
                    className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2"
                  >
                    <Card interactive className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden
                            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-600 ring-1 ring-neutral-200"
                          >
                            {initial}
                          </span>
                          <p className="min-w-0 truncate text-xs text-neutral-500">
                            https://{host}
                            {path ? ` › ${path}` : ""}
                          </p>
                        </div>
                        <p
                          className={cn(
                            "mt-2 truncate text-base",
                            title ? "text-brand-700" : "italic text-neutral-400",
                          )}
                        >
                          {title || "Ingen titel angiven ännu"}
                        </p>
                        <p
                          className={cn(
                            "mt-0.5 line-clamp-2 text-sm",
                            description ? "text-neutral-600" : "italic text-neutral-400",
                          )}
                        >
                          {description || "Ingen beskrivning angiven ännu"}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-end">
                        <Badge tone={lengthTone(title.length, TITLE_LIMIT)}>
                          Titel {title.length}/{TITLE_LIMIT}
                        </Badge>
                        <Badge tone={lengthTone(description.length, DESCRIPTION_LIMIT)}>
                          Beskrivning {description.length}/{DESCRIPTION_LIMIT}
                        </Badge>
                      </div>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Lägg till SEO för fler sidor</CardTitle>
            <CardDescription>
              Ange sidans adress utan snedstreck och domän, t.ex. &quot;om-oss&quot; eller &quot;kontakt&quot;.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createSeoMeta.bind(null, siteId)} className="flex flex-wrap items-end gap-3">
              <Field htmlFor="pageSlug" label="Sidans adress" className="min-w-0 flex-1 basis-60">
                <Input
                  id="pageSlug"
                  name="pageSlug"
                  type="text"
                  required
                  placeholder="om-oss"
                />
              </Field>
              <SubmitButton icon={<Plus />} pendingText="Lägger till…">
                Lägg till
              </SubmitButton>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trafik-sektionen (bara när det finns data)
// ---------------------------------------------------------------------------

function TrafficSection({ traffic, period }: { traffic: NonNullable<TrafficView>; period: Period }) {
  const { summary } = traffic;
  const kpis: { label: string; value: number; change: string | null; hint: string }[] = [
    {
      label: "Besökare",
      value: summary.visitors,
      change: formatPercentChange(summary.visitors, summary.prevVisitors),
      hint: `${formatNumber(summary.prevVisitors)} föregående ${period} dagar`,
    },
    {
      label: "Sidvisningar",
      value: summary.views,
      change: formatPercentChange(summary.views, summary.prevViews),
      hint: `${formatNumber(summary.prevViews)} föregående ${period} dagar`,
    },
  ];

  const columns: { title: string; rows: TrafficBreakdownRow[]; render: (value: string) => React.ReactNode }[] = [
    { title: "Sidor", rows: traffic.paths, render: (v) => <span className="font-mono text-xs">{pathLabel(v)}</span> },
    { title: "Källor", rows: traffic.sources, render: (v) => sourceLabel(v) },
    {
      title: "Länder",
      rows: traffic.countries,
      render: (v) => (
        <>
          <span aria-hidden className="mr-1.5">
            {countryFlag(v)}
          </span>
          {countryName(v)}
        </>
      ),
    },
    { title: "Enheter", rows: traffic.devices, render: (v) => deviceLabel(v) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="p-4 sm:p-5">
            <p className="text-sm text-neutral-500">{kpi.label}</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-2xl font-semibold tabular-nums text-neutral-900">{formatNumber(kpi.value)}</p>
              {kpi.change === null ? (
                <span className="text-sm text-neutral-400" title="Ingen trafik föregående period att jämföra med">
                  –
                </span>
              ) : (
                <Badge tone={kpi.change.startsWith("+") ? "success" : kpi.change.startsWith("−") ? "danger" : "neutral"}>
                  {kpi.change}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-neutral-500">{kpi.hint}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Per dag</CardTitle>
          <CardDescription>Senaste {period} dagarna, UTC-dygn.</CardDescription>
        </CardHeader>
        <CardContent>
          <TrafficChart series={summary.series} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {columns.map((column) => (
          <Card key={column.title} className="min-w-0">
            <CardHeader>
              <CardTitle>{column.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {column.rows.length === 0 ? (
                <p className="text-sm text-neutral-500">Inget under perioden.</p>
              ) : (
                <ol className="space-y-3">
                  {column.rows.map((row) => (
                    <li key={row.value} className="min-w-0">
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate text-neutral-800" title={row.value}>
                          {column.render(row.value)}
                        </span>
                        <span className="shrink-0 tabular-nums text-neutral-600">
                          {formatNumber(row.views)}
                          <span className="ml-1.5 text-xs text-neutral-400">{Math.round(row.share * 100)} %</span>
                        </span>
                      </div>
                      <div aria-hidden className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                        <div
                          className="h-full rounded-full bg-brand-600"
                          style={{ width: `${Math.max(2, Math.min(100, Math.round(row.share * 100)))}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
