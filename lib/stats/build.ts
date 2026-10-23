import type { Day, Kpi, Series, SiteStats } from "./contract";

/**
 * Rena hjälpare för /api/stats (ingen DB) — testas i scripts/stats-test.ts.
 */

/** Kundsajter (sites.slug) som exponeras i `sites`. Lägg till fler när de går i produktion. */
export const STATS_SITE_SLUGS = ["jjbygg"] as const;

export type DayCount = { day: Day; n: number };

/**
 * Bygger en serie med exakt `days.length` punkter (normalt 31). Rader utanför
 * intervallet ignoreras, saknade dagar blir 0, dubbletter summeras.
 */
export function buildSeries(key: string, label: string, days: Day[], rows: Iterable<DayCount>): Series {
  const byDay = new Map<Day, number>();
  for (const row of rows) byDay.set(row.day, (byDay.get(row.day) ?? 0) + Number(row.n));
  return { key, label, unit: "count", points: days.map((day) => ({ day, value: byDay.get(day) ?? 0 })) };
}

/** Summa av rader med `day >= from` (t.o.m. idag). */
export function sumFrom(rows: Iterable<DayCount>, from: Day): number {
  let sum = 0;
  for (const row of rows) if (row.day >= from) sum += Number(row.n);
  return sum;
}

export type SiteInput = {
  quotesTotal: number;
  quotesNew: number;
  quotes7d: number;
  quotes30d: number;
  visitors7d: number;
  quoteDays: DayCount[];
  visitorDays: DayCount[];
};

export const QUOTES_LABEL = "Offertförfrågningar";
export const VISITORS_LABEL = "Besökare (UTC-dag)";

/** `sites[slug]`-blocket: kpis + serierna quotes och visitors. */
export function buildSiteStats(days: Day[], input: SiteInput): SiteStats {
  const kpis: Kpi[] = [
    { key: "quotes_total", label: QUOTES_LABEL, value: input.quotesTotal, unit: "count", hint: "totalt i SiteCMS (sedan CMS-kopplingen)" },
    { key: "quotes_new_status", label: "Obesvarade förfrågningar", value: input.quotesNew, unit: "count", hint: "obesvarade" },
    { key: "quotes_7d", label: "Förfrågningar 7 d", value: input.quotes7d, unit: "count", hint: "senaste 7 dygnen" },
    { key: "quotes_30d", label: "Förfrågningar 30 d", value: input.quotes30d, unit: "count", hint: "senaste 30 dygnen" },
    { key: "visitors_7d", label: "Besökare 7 d", value: input.visitors7d, unit: "count", hint: "egen pixel, UTC-dagar" },
  ];
  return {
    users: null,
    kpis,
    series: [
      buildSeries("quotes", QUOTES_LABEL, days, input.quoteDays),
      buildSeries("visitors", VISITORS_LABEL, days, input.visitorDays),
    ],
  };
}
