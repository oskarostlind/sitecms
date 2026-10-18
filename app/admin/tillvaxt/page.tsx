import Link from "next/link";
import { and, eq, gte, inArray, isNotNull, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { authTokens, memberships, sites, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { sourceGroup } from "@/lib/attribution";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader } from "@/components/ui";
import { cn } from "@/lib/cn";

/**
 * Tillväxt: var kommer kontona ifrån, och hur långt kommer de?
 * Mätvärdet är konton och aktiverade sajter — aldrig visningar.
 */

const RANGES = [
  { key: "30", label: "30 dagar", days: 30 },
  { key: "90", label: "90 dagar", days: 90 },
  { key: "all", label: "Allt", days: null },
] as const;

type Row = { label: string; count: number; sub?: string };

function countBy<T>(items: T[], key: (item: T) => string): Row[] {
  const map = new Map<string, number>();
  for (const item of items) map.set(key(item), (map.get(key(item)) ?? 0) + 1);
  return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

function Bars({ rows, total, empty }: { rows: Row[]; total: number; empty: string }) {
  if (rows.length === 0) return <p className="text-sm text-neutral-500">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const pct = total ? Math.round((r.count / total) * 100) : 0;
        return (
          <li key={r.label} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-neutral-800">{r.label}</span>
              <span className="shrink-0 tabular-nums text-neutral-600">
                {r.count} <span className="text-neutral-400">({pct} %)</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
              <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.max(pct, 2)}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default async function GrowthPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requireAdmin();
  const { range: rangeParam } = await searchParams;
  const range = RANGES.find((r) => r.key === rangeParam) ?? RANGES[0];
  const since = range.days ? new Date(Date.now() - range.days * 24 * 60 * 60 * 1000) : null;

  // Självregistrerade konton (inte admin, inte inbjudna kunder — de räknas för sig).
  const accountRows = await db
    .select({
      id: users.id,
      source: users.signupSource,
      landing: users.signupLanding,
      verifiedAt: users.emailVerifiedAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(ne(users.role, "admin"), since ? gte(users.createdAt, since) : undefined));

  const selfServe = accountRows.filter((u) => u.source !== "inbjudan");
  const invited = accountRows.length - selfServe.length;
  const ids = selfServe.map((u) => u.id);

  const createdSites = ids.length
    ? await db
        .select({ id: sites.id, createdBy: sites.createdByUserId, syncedAt: sites.lastSchemaSyncAt })
        .from(sites)
        .where(inArray(sites.createdByUserId, ids))
    : [];
  const siteIds = createdSites.map((s) => s.id);

  // En sajt räknas som "kund inbjuden" när det finns en redaktör eller en skickad inbjudan.
  const [editorRows, inviteRows] = siteIds.length
    ? await Promise.all([
        db
          .select({ siteId: memberships.siteId })
          .from(memberships)
          .where(and(inArray(memberships.siteId, siteIds), eq(memberships.role, "editor"))),
        db
          .select({ siteId: authTokens.siteId })
          .from(authTokens)
          .where(and(eq(authTokens.type, "invite"), isNotNull(authTokens.siteId), inArray(authTokens.siteId, siteIds))),
      ])
    : [[], []];
  const sitesWithCustomer = new Set([...editorRows, ...inviteRows].map((r) => r.siteId));

  const usersWithSite = new Set(createdSites.map((s) => s.createdBy));
  const usersWithSync = new Set(createdSites.filter((s) => s.syncedAt).map((s) => s.createdBy));
  const usersWithCustomer = new Set(createdSites.filter((s) => sitesWithCustomer.has(s.id)).map((s) => s.createdBy));

  const funnel = [
    { label: "Konton skapade", count: selfServe.length, hint: "Självregistrerade (e-post eller Google)" },
    { label: "E-post bekräftad", count: selfServe.filter((u) => u.verifiedAt).length, hint: "Klickade på länken i mejlet" },
    { label: "Skapade en sajt", count: usersWithSite.size, hint: "Minst en sajt i panelen" },
    { label: "Kopplade sajten", count: usersWithSync.size, hint: "Schema synkat från kundsajten" },
    { label: "Bjöd in kunden", count: usersWithCustomer.size, hint: "Redaktör tillagd eller inbjudan skickad" },
  ];

  const byGroup = countBy(selfServe, (u) => sourceGroup(u.source));
  const bySource = countBy(selfServe, (u) => u.source ?? "okänd (före mätning)").slice(0, 12);
  const byLanding = countBy(
    selfServe.filter((u) => u.landing),
    (u) => u.landing!,
  ).slice(0, 12);

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        title="Tillväxt"
        description="Varifrån kontona kommer och hur långt de kommer. Källan sätts vid besökarens första sidvisning och sparas när kontot skapas."
        actions={
          <nav aria-label="Period" className="flex rounded-lg border border-neutral-200 bg-white p-0.5">
            {RANGES.map((r) => (
              <Link
                key={r.key}
                href={`/admin/tillvaxt?range=${r.key}`}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  r.key === range.key ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100",
                )}
              >
                {r.label}
              </Link>
            ))}
          </nav>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Tratt</CardTitle>
          <CardDescription>
            Senaste {range.days ? `${range.days} dagarna` : "hela perioden"}. {invited} inbjudna kundkonton räknas inte
            här.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-3 sm:grid-cols-5">
            {funnel.map((step, i) => {
              const prev = i === 0 ? null : funnel[i - 1].count;
              const conv = prev ? Math.round((step.count / prev) * 100) : null;
              return (
                <li key={step.label} className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-3">
                  <p className="text-xs text-neutral-500">{step.label}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">{step.count}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {conv === null ? step.hint : `${conv} % av föregående`}
                  </p>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Konton per kanal</CardTitle>
            <CardDescription>Grupperat: sök, AI-assistenter, sociala medier, GitHub/npm, hänvisningar, direkt.</CardDescription>
          </CardHeader>
          <CardContent>
            <Bars rows={byGroup} total={selfServe.length} empty="Inga konton under perioden ännu." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Konton per källa</CardTitle>
            <CardDescription>Exakt källa: sökmotor, UTM-kampanj eller hänvisande domän.</CardDescription>
          </CardHeader>
          <CardContent>
            <Bars rows={bySource} total={selfServe.length} empty="Inga konton under perioden ännu." />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Landningssidor som ledde till konton</CardTitle>
            <CardDescription>
              Den första sidan besökaren kom in på. Visar vilka guider som faktiskt ger konton — inte bara besök.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Bars rows={byLanding} total={selfServe.length} empty="Inga konton med registrerad landningssida ännu." />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
