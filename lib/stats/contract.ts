// stats-contract.ts — Mission Control stats-kontrakt v1. Inga personuppgifter: bara aggregerade tal.
// Kopia av ARCHITECTURE.md §1 (marketing-portal har sin egen kopia i src/lib/mission/stats-contract.ts).
// En ändring = bump av STATS_VERSION och uppdatering i alla kopior.
export const STATS_VERSION = 1 as const;

/** "YYYY-MM-DD" i Europe/Stockholm. */
export type Day = string;

export type SeriesPoint = { day: Day; value: number };

export type Series = {
  /** Stabil nyckel, snake_case, t.ex. "users_new", "quotes", "revenue_gross". */
  key: string;
  label: string; // svensk visningstext
  unit?: "count" | "minor" | "pct"; // default "count". "minor" = minsta valutaenhet (öre) för intäkter.
  /** Exakt 31 punkter: de senaste 30 hela Stockholm-dagarna + dagens (partiella) dag, stigande, noll-fyllda. */
  points: SeriesPoint[];
};

export type Kpi = {
  key: string;
  label: string;
  value: number; // alltid ett tal; valuta i minor units (öre)
  unit?: "count" | "minor" | "pct";
  hint?: string; // kort förklaring, visas som title/underrad
};

export type UsersBlock = {
  /** Vad "användare" betyder i det här projektet: "Användare", "Prenumeranter", "API-konton", "Konton". */
  noun: string;
  total: number;
  new1d: number; // registrerade idag (Stockholm-dag, partiell)
  new7d: number; // rullande: createdAt >= now − 7×24 h
  new30d: number; // rullande: createdAt >= now − 30×24 h
  active7d: number | null; // null = mäts inte
  active30d: number | null;
};

export type RevenueSource = "stripe" | "admob" | "appstore";

export type RevenueBlock = {
  currency: "SEK";
  gross31d: number;
  net31d: number | null;
  mrr: number | null;
  activeSubscriptions: number | null;
  bySource: { source: RevenueSource; gross31d: number; net31d: number | null; lagDays: number; hint?: string }[];
  series: Series[];
};

export type SiteStats = { users: null; kpis: Kpi[]; series: Series[] };

export type StatsResponse = {
  version: typeof STATS_VERSION;
  /** Vercel-projektnamnet. För SiteCMS: "sitecms". */
  project: string;
  generatedAt: string; // ISO-8601
  tz: "Europe/Stockholm";
  users: UsersBlock | null;
  kpis: Kpi[];
  series: Series[];
  revenue: RevenueBlock | null;
  /** Tal per kundsajt (nyckel = sites.slug) som portalen mappar till andra Vercel-projekt. */
  sites?: Record<string, SiteStats>;
  /** Ickefatala fel per källa. Bara fasta texter, aldrig data ur användartabeller. */
  warnings?: string[];
};

export const STATS_TZ = "Europe/Stockholm" as const;
export const SERIES_DAYS = 31;

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: STATS_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Kalenderdag i Europe/Stockholm, "YYYY-MM-DD". */
export const stockholmDay = (d: Date = new Date()): Day => dayFormatter.format(d);

/** `day` ± n kalenderdagar, fortfarande "YYYY-MM-DD". */
export function addDays(day: Day, delta: number): Day {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** De 31 dagarna idag − 30 … idag (Stockholm), stigande. */
export function seriesDays(now: Date = new Date()): Day[] {
  const today = stockholmDay(now);
  return Array.from({ length: SERIES_DAYS }, (_, i) => addDays(today, i - (SERIES_DAYS - 1)));
}

/** 31 dagar: idag − 30 … idag (Stockholm), noll-fyllda. */
export function emptySeries(now: Date = new Date()): SeriesPoint[] {
  return seriesDays(now).map((day) => ({ day, value: 0 }));
}

/** Start av Stockholm-dag som UTC-Date (för WHERE created_at >= …). */
export function startOfStockholmDay(day: Day): Date {
  const [y, m, d] = day.split("-").map(Number);
  const utcMidnight = Date.UTC(y, m - 1, d);
  // Stockholms offset vid den tidpunkten (+1 h vintertid, +2 h sommartid).
  const offsetAt = (ms: number) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: STATS_TZ,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(new Date(ms));
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
    return asUtc - ms;
  };
  let guess = utcMidnight - offsetAt(utcMidnight);
  guess = utcMidnight - offsetAt(guess);
  return new Date(guess);
}
