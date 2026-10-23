import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { addDays, seriesDays, startOfStockholmDay, STATS_VERSION, type Kpi, type SiteStats, type StatsResponse } from "./contract";
import { buildSeries, buildSiteStats, sumFrom, STATS_SITE_SLUGS, type DayCount } from "./build";

/**
 * Mission Control-statistik för SiteCMS (ARCHITECTURE.md §4.5). Bara
 * aggregerade tal — inga namn, e-postadresser, id:n eller leadkällor.
 *
 * Definitionerna följer adminpanelen:
 *  - konton = users.role = 'customer'; självregistrerade = signup_source ≠ 'inbjudan'
 *    (app/admin/tillvaxt/page.tsx)
 *  - förfrågningar per status (app/admin/sites/[siteId]/forfragningar/page.tsx)
 *  - besökare = traffic_daily.visitors, UTC-dagar, 7 d = idag − 6 … idag (lib/traffic.ts)
 */

type Rows<T> = { rows: T[] };

async function query<T>(q: ReturnType<typeof sql>): Promise<T[]> {
  const res = (await db.execute(q)) as unknown as Rows<T>;
  return res.rows;
}

const n = (v: unknown) => Number(v ?? 0) || 0;

export async function collectStats(now: Date = new Date()): Promise<StatsResponse> {
  const days = seriesDays(now);
  const today = days[days.length - 1];
  const seriesStart = startOfStockholmDay(days[0]).toISOString();
  const todayStart = startOfStockholmDay(today).toISOString();
  const utcToday = now.toISOString().slice(0, 10);
  const visitorsFrom = addDays(utcToday, -6);
  const trafficFrom = days[0] < visitorsFrom ? days[0] : visitorsFrom;
  const warnings: string[] = [];

  const [userRows, activeRows, dayRows, quoteRows, siteRows, trafficRows] = await Promise.all([
    query<{ total: number; new1d: number; new7d: number; new30d: number; self_serve: number }>(sql`
      SELECT count(*)::int AS total,
             count(*) FILTER (WHERE created_at >= ${todayStart}::timestamptz)::int AS new1d,
             count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS new7d,
             count(*) FILTER (WHERE created_at >= now() - interval '30 days')::int AS new30d,
             count(*) FILTER (WHERE signup_source IS DISTINCT FROM 'inbjudan')::int AS self_serve
      FROM users WHERE role = 'customer'`),
    query<{ a7: number; a30: number }>(sql`
      SELECT count(DISTINCT a.user_id) FILTER (WHERE a.created_at >= now() - interval '7 days')::int AS a7,
             count(DISTINCT a.user_id)::int AS a30
      FROM audit_logs a JOIN users u ON u.id = a.user_id AND u.role = 'customer'
      WHERE a.created_at >= now() - interval '30 days'`).catch(() => {
      warnings.push("active: audit_logs kunde inte läsas");
      return null;
    }),
    query<{ k: string; site_id: string | null; day: string; n: number }>(sql`
      SELECT 'users' AS k, NULL::uuid AS site_id,
             to_char((created_at AT TIME ZONE 'Europe/Stockholm')::date, 'YYYY-MM-DD') AS day, count(*)::int AS n
      FROM users WHERE role = 'customer' AND created_at >= ${seriesStart}::timestamptz
      GROUP BY (created_at AT TIME ZONE 'Europe/Stockholm')::date
      UNION ALL
      SELECT 'sites', NULL::uuid,
             to_char((created_at AT TIME ZONE 'Europe/Stockholm')::date, 'YYYY-MM-DD'), count(*)::int
      FROM sites WHERE created_at >= ${seriesStart}::timestamptz
      GROUP BY (created_at AT TIME ZONE 'Europe/Stockholm')::date
      UNION ALL
      SELECT 'quotes', site_id,
             to_char((created_at AT TIME ZONE 'Europe/Stockholm')::date, 'YYYY-MM-DD'), count(*)::int
      FROM quote_requests WHERE created_at >= ${seriesStart}::timestamptz
      GROUP BY site_id, (created_at AT TIME ZONE 'Europe/Stockholm')::date`),
    query<{ site_id: string; total: number; ny: number; q7: number; q30: number }>(sql`
      SELECT site_id,
             count(*)::int AS total,
             count(*) FILTER (WHERE status = 'ny')::int AS ny,
             count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS q7,
             count(*) FILTER (WHERE created_at >= now() - interval '30 days')::int AS q30
      FROM quote_requests GROUP BY site_id`),
    query<{ id: string; slug: string; connected: boolean }>(sql`
      SELECT id, slug, (last_schema_sync_at IS NOT NULL) AS connected FROM sites`),
    query<{ site_id: string; day: string; n: number }>(sql`
      SELECT site_id, to_char(day, 'YYYY-MM-DD') AS day, visitors::int AS n
      FROM traffic_daily WHERE day >= ${trafficFrom}::date`),
  ]);

  const u = userRows[0];
  const active = activeRows?.[0];

  const usersDays: DayCount[] = [];
  const sitesDays: DayCount[] = [];
  const quoteDaysAll: DayCount[] = [];
  const quoteDaysBySite = new Map<string, DayCount[]>();
  for (const r of dayRows) {
    const row = { day: r.day, n: n(r.n) };
    if (r.k === "users") usersDays.push(row);
    else if (r.k === "sites") sitesDays.push(row);
    else if (r.k === "quotes") {
      quoteDaysAll.push(row);
      if (r.site_id) quoteDaysBySite.set(r.site_id, [...(quoteDaysBySite.get(r.site_id) ?? []), row]);
    }
  }

  const visitorDaysBySite = new Map<string, DayCount[]>();
  const visitorDaysAll: DayCount[] = [];
  for (const r of trafficRows) {
    const row = { day: r.day, n: n(r.n) };
    visitorDaysAll.push(row);
    visitorDaysBySite.set(r.site_id, [...(visitorDaysBySite.get(r.site_id) ?? []), row]);
  }

  const quotesBySite = new Map(quoteRows.map((r) => [r.site_id, r]));
  const quotesTotal = quoteRows.reduce((s, r) => s + n(r.total), 0);
  const quotesNew = quoteRows.reduce((s, r) => s + n(r.ny), 0);

  const kpis: Kpi[] = [
    { key: "sites_total", label: "Sajter", value: siteRows.length, unit: "count" },
    { key: "sites_connected", label: "Kopplade sajter", value: siteRows.filter((s) => s.connected).length, unit: "count", hint: "schema synkat från kundsajten" },
    { key: "self_serve_accounts", label: "Självregistrerade konton", value: n(u?.self_serve), unit: "count", hint: "exkl. inbjudna kundkonton" },
    { key: "quotes_total", label: "Offertförfrågningar", value: quotesTotal, unit: "count", hint: "alla sajter" },
    { key: "quotes_new_status", label: "Obesvarade förfrågningar", value: quotesNew, unit: "count", hint: "obesvarade" },
    { key: "visitors_7d", label: "Besökare 7 d", value: sumFrom(visitorDaysAll, visitorsFrom), unit: "count", hint: "alla sajter, egen pixel, UTC-dagar" },
  ];

  const sites: Record<string, SiteStats> = {};
  const allowed = new Set<string>(STATS_SITE_SLUGS);
  for (const site of siteRows) {
    if (!allowed.has(site.slug)) continue;
    const q = quotesBySite.get(site.id);
    const visitorDays = visitorDaysBySite.get(site.id) ?? [];
    sites[site.slug] = buildSiteStats(days, {
      quotesTotal: n(q?.total),
      quotesNew: n(q?.ny),
      quotes7d: n(q?.q7),
      quotes30d: n(q?.q30),
      visitors7d: sumFrom(visitorDays, visitorsFrom),
      quoteDays: quoteDaysBySite.get(site.id) ?? [],
      visitorDays,
    });
  }
  for (const slug of STATS_SITE_SLUGS) if (!sites[slug]) warnings.push(`sites: ${slug} saknas`);

  return {
    version: STATS_VERSION,
    project: "sitecms",
    generatedAt: now.toISOString(),
    tz: "Europe/Stockholm",
    users: {
      noun: "Konton",
      total: n(u?.total),
      new1d: n(u?.new1d),
      new7d: n(u?.new7d),
      new30d: n(u?.new30d),
      active7d: active ? n(active.a7) : null,
      active30d: active ? n(active.a30) : null,
    },
    kpis,
    series: [
      buildSeries("users_new", "Nya konton", days, usersDays),
      buildSeries("quotes", "Offertförfrågningar (alla sajter)", days, quoteDaysAll),
      buildSeries("sites_new", "Nya sajter", days, sitesDays),
    ],
    revenue: null,
    sites,
    ...(warnings.length ? { warnings } : {}),
  };
}
