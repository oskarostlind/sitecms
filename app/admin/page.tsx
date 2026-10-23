import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Building2, Globe, Plus } from "lucide-react";
import { requireUser, getUserSites } from "@/lib/guard";
import { Alert, Avatar, Badge, ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { formatDateTime, formatNumber, relativeTime } from "@/lib/format";
import { displayDomain } from "@/lib/site-url";
import { getVisitorSeriesForSites, type DayPoint } from "@/lib/traffic";
import { getScoresForSitesOrLive } from "@/lib/seo-score";
import { Sparkline } from "@/components/admin/Sparkline";
import { scoreTone } from "@/components/admin/ScoreRing";

/** Trafik och poäng får aldrig fälla listan (nya/tomma tabeller) → tom Map vid fel. */
async function safeMap<K, V>(label: string, promise: Promise<Map<K, V>>): Promise<Map<K, V>> {
  try {
    return await promise;
  } catch (err) {
    console.error(`admin: ${label} misslyckades`, err);
    return new Map();
  }
}

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; list?: string }>;
}) {
  const { error, list } = await searchParams;
  const user = await requireUser();
  const sites = await getUserSites(user);
  const isAdmin = user.role === "admin";

  // Ett enda ställe att vara på → hoppa dit direkt, utom när listan uttryckligen begärs.
  if (sites.length === 1 && !list) {
    redirect(`/admin/sites/${sites[0].id}`);
  }

  const sorted = [...sites].sort((a, b) => a.name.localeCompare(b.name, "sv"));
  const siteIds = sorted.map((site) => site.id);

  // En query för alla sajter per källa (docs/SEO-TRAFIK.md §8).
  const [visitorSeries, scores] = await Promise.all([
    safeMap<string, DayPoint[]>("getVisitorSeriesForSites", getVisitorSeriesForSites(siteIds, 7)),
    safeMap<string, number>("getScoresForSitesOrLive", getScoresForSitesOrLive(siteIds)),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dina sajter"
        description={
          isAdmin
            ? "Alla sajter i systemet. Välj en sajt för att ändra dess innehåll."
            : "Välj vilken sajt du vill hantera."
        }
        actions={
          <ButtonLink href="/admin/sites/new" icon={<Plus />}>
            Ny sajt
          </ButtonLink>
        }
        className="mb-0"
      />

      {error === "forbidden" ? (
        <Alert tone="warning" title="Du har inte åtkomst till den sajten">
          Välj en av dina sajter nedan i stället.
        </Alert>
      ) : null}

      {sorted.length === 0 ? (
        <EmptyState
          icon={<Building2 />}
          title="Inga sajter kopplade till ditt konto ännu."
          description="Skapa en sajt för att komma igång, eller be sajtens ägare att bjuda in dig."
          action={
            isAdmin ? (
              <ButtonLink href="/admin/sites/new" icon={<Plus />}>
                Skapa din första sajt
              </ButtonLink>
            ) : null
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((site) => {
            const domain = displayDomain(site.domain);
            const series = visitorSeries.get(site.id) ?? [];
            const visitors = series.reduce((sum, point) => sum + point.visitors, 0);
            const score = scores.get(site.id);
            return (
              <li key={site.id} className="min-w-0">
                <Link
                  href={`/admin/sites/${site.id}`}
                  className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2"
                >
                  <Card interactive className="flex h-full flex-col p-5">
                    <div className="flex items-start gap-3">
                      <Avatar name={site.name} size={44} className="rounded-lg" />
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-base font-semibold text-neutral-900">{site.name}</h2>
                        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-neutral-500">
                          <Globe aria-hidden className="size-3.5 shrink-0 text-neutral-400" />
                          {domain ? (
                            <span className="truncate">{domain}</span>
                          ) : (
                            <span className="truncate italic text-neutral-400">Ingen domän angiven</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Trafik + poäng */}
                    <div className="mt-4 flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-neutral-700">
                          <span className="font-medium tabular-nums text-neutral-900">{formatNumber(visitors)}</span>{" "}
                          besökare · 7 dagar
                        </p>
                        <Sparkline
                          points={series.map((point) => point.visitors)}
                          ariaLabel={`${site.name}: besökare per dag, senaste 7 dagarna`}
                          className="mt-1 h-6 w-full max-w-40"
                        />
                      </div>
                      {typeof score === "number" ? (
                        <Badge tone={scoreTone(score)} dot title={`SEO-poäng ${score} av 100`}>
                          SEO {score}
                        </Badge>
                      ) : (
                        <Badge tone="neutral" title="Ingen SEO-poäng beräknad ännu">
                          SEO –
                        </Badge>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
                      <span title={formatDateTime(site.updatedAt)}>Uppdaterad {relativeTime(site.updatedAt)}</span>
                      <ArrowRight
                        aria-hidden
                        className="size-4 shrink-0 text-neutral-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-brand-600"
                      />
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
