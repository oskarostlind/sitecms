/**
 * Trafik (docs/SEO-TRAFIK.md §4): skrivning från events-routen och läsning
 * för panelen. Bara dagsaggregat per sajt + en kortlivad besökartabell som
 * enbart finns för att räkna unika (töms av cronen via `purgeOldVisitors`).
 *
 * Fungerar med båda db-drivrutinerna: `db.batch` används när den finns
 * (neon-http), annars körs frågorna i tur och ordning (pg lokalt).
 */
import { and, desc, eq, gte, inArray, lt, lte, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { db, trafficDaily, trafficDailyDims, trafficVisitors } from "@/lib/db";
import { OVERFLOW_PATH, dayRange, shiftDay, utcDay, type NormalizedEvent } from "@/lib/traffic-normalize";

export type { NormalizedEvent } from "@/lib/traffic-normalize";

export type TrafficDim = "path" | "source" | "country" | "device";
export type DayPoint = { day: string /* YYYY-MM-DD */; views: number; visitors: number };
export type TrafficSummary = {
  days: number;
  views: number;
  visitors: number;
  /** Samma antal dagar direkt före perioden. */
  prevViews: number;
  prevVisitors: number;
  /** En punkt per dag, luckor = 0. */
  series: DayPoint[];
  /** Någon rad någonsin för sajten. */
  hasData: boolean;
};
export type TrafficBreakdownRow = { value: string; views: number; share: number };

/** Max sidvisningar per besökare och dag som räknas (§2). */
export const MAX_VIEWS_PER_VISITOR_PER_DAY = 100;
/** Max distinkta sökvägar per sajt och dag; därefter bokförs `/…` (§2). */
export const MAX_PATHS_PER_DAY = 500;

type Queries = [BatchItem<"pg">, ...BatchItem<"pg">[]];

/** `db.batch` på neon-http, annars sekventiellt (pg). Resultaten i samma ordning. */
async function runAll(queries: BatchItem<"pg">[]): Promise<unknown[]> {
  if (queries.length === 0) return [];
  const batch = (db as unknown as { batch?: (q: Queries) => Promise<unknown[]> }).batch;
  if (typeof batch === "function") {
    return batch.call(db, queries as Queries);
  }
  const results: unknown[] = [];
  for (const query of queries) results.push(await (query as unknown as Promise<unknown>));
  return results;
}

function bump<K>(map: Map<K, number>, key: K, by = 1) {
  map.set(key, (map.get(key) ?? 0) + by);
}

// ---------------------------------------------------------------------------
// Skrivning
// ---------------------------------------------------------------------------

/**
 * Bokför sidvisningar för dagens UTC-dag. Två steg:
 *
 * 1. Upsert i `traffic_visitors` per besökarhash (RETURNING views). Returen
 *    avslöjar om besökaren är ny i dag (visitors +1) och hur många av
 *    besökarens visningar som ryms under taket på 100/dag — resten ignoreras.
 * 2. En upsert i `traffic_daily` och en i `traffic_daily_dims` (alla
 *    dimensioner på en gång) med de visningar som räknas. Passerar sajten
 *    500 distinkta sökvägar bokförs nya sökvägar som `/…`.
 */
export async function recordPageviews(siteId: string, events: NormalizedEvent[]): Promise<void> {
  if (events.length === 0) return;
  const day = utcDay();

  // 1. Besökare: gruppera i ankomstordning.
  const byVisitor = new Map<string, NormalizedEvent[]>();
  for (const event of events) {
    const list = byVisitor.get(event.visitorHash);
    if (list) list.push(event);
    else byVisitor.set(event.visitorHash, [event]);
  }
  const hashes = Array.from(byVisitor.keys());
  const visitorQueries = hashes.map((visitorHash) =>
    db
      .insert(trafficVisitors)
      .values({ siteId, day, visitorHash, views: byVisitor.get(visitorHash)!.length })
      .onConflictDoUpdate({
        target: [trafficVisitors.siteId, trafficVisitors.day, trafficVisitors.visitorHash],
        set: { views: sql`${trafficVisitors.views} + excluded.views` },
      })
      .returning({ views: trafficVisitors.views }),
  );
  const visitorResults = (await runAll(visitorQueries)) as { views: number }[][];

  let newVisitors = 0;
  const accepted: NormalizedEvent[] = [];
  hashes.forEach((hash, i) => {
    const mine = byVisitor.get(hash)!;
    const total = Number(visitorResults[i]?.[0]?.views ?? mine.length);
    const before = total - mine.length;
    if (before <= 0) newVisitors += 1;
    const room = Math.max(0, Math.min(mine.length, MAX_VIEWS_PER_VISITOR_PER_DAY - Math.max(0, before)));
    accepted.push(...mine.slice(0, room));
  });
  if (accepted.length === 0 && newVisitors === 0) return;

  // 2. Sökvägstak: vilka sökvägar finns redan i dag?
  const existingPaths = new Set(
    (
      await db
        .select({ value: trafficDailyDims.value })
        .from(trafficDailyDims)
        .where(and(eq(trafficDailyDims.siteId, siteId), eq(trafficDailyDims.day, day), eq(trafficDailyDims.dim, "path")))
    ).map((r) => r.value),
  );
  let pathCount = existingPaths.size;

  const dims: Record<TrafficDim, Map<string, number>> = {
    path: new Map(),
    source: new Map(),
    country: new Map(),
    device: new Map(),
  };
  for (const event of accepted) {
    let path = event.path;
    if (!existingPaths.has(path)) {
      if (pathCount >= MAX_PATHS_PER_DAY && path !== OVERFLOW_PATH) {
        path = OVERFLOW_PATH;
        if (!existingPaths.has(path)) {
          existingPaths.add(path);
        }
      } else {
        existingPaths.add(path);
        pathCount += 1;
      }
    }
    bump(dims.path, path);
    bump(dims.source, event.source);
    bump(dims.country, event.country);
    bump(dims.device, event.device);
  }

  const dimRows: { siteId: string; day: string; dim: TrafficDim; value: string; views: number }[] = [];
  for (const dim of Object.keys(dims) as TrafficDim[]) {
    for (const [value, views] of dims[dim]) dimRows.push({ siteId, day, dim, value, views });
  }

  const writes: BatchItem<"pg">[] = [
    db
      .insert(trafficDaily)
      .values({ siteId, day, views: accepted.length, visitors: newVisitors })
      .onConflictDoUpdate({
        target: [trafficDaily.siteId, trafficDaily.day],
        set: {
          views: sql`${trafficDaily.views} + excluded.views`,
          visitors: sql`${trafficDaily.visitors} + excluded.visitors`,
          updatedAt: sql`now()`,
        },
      }),
  ];
  if (dimRows.length > 0) {
    writes.push(
      db
        .insert(trafficDailyDims)
        .values(dimRows)
        .onConflictDoUpdate({
          target: [trafficDailyDims.siteId, trafficDailyDims.day, trafficDailyDims.dim, trafficDailyDims.value],
          set: { views: sql`${trafficDailyDims.views} + excluded.views` },
        }),
    );
  }
  await runAll(writes);
}

// ---------------------------------------------------------------------------
// Läsning
// ---------------------------------------------------------------------------

/** Perioden `days` dagar t.o.m. i dag (UTC) samt lika lång period före. */
function periods(days: number, today = utcDay()) {
  const from = shiftDay(today, -(days - 1));
  const prevTo = shiftDay(from, -1);
  const prevFrom = shiftDay(prevTo, -(days - 1));
  return { from, to: today, prevFrom, prevTo };
}

function fillSeries(from: string, to: string, rows: Iterable<DayPoint>): DayPoint[] {
  const byDay = new Map<string, DayPoint>();
  for (const row of rows) byDay.set(row.day, row);
  return dayRange(from, to).map((day) => byDay.get(day) ?? { day, views: 0, visitors: 0 });
}

export async function getTrafficSummary(siteId: string, days: 7 | 30): Promise<TrafficSummary> {
  const { from, to, prevFrom, prevTo } = periods(days);
  const rows = await db
    .select({ day: trafficDaily.day, views: trafficDaily.views, visitors: trafficDaily.visitors })
    .from(trafficDaily)
    .where(and(eq(trafficDaily.siteId, siteId), gte(trafficDaily.day, prevFrom), lte(trafficDaily.day, to)));

  let views = 0;
  let visitors = 0;
  let prevViews = 0;
  let prevVisitors = 0;
  const current: DayPoint[] = [];
  for (const row of rows) {
    const point = { day: String(row.day), views: Number(row.views), visitors: Number(row.visitors) };
    if (point.day >= from) {
      views += point.views;
      visitors += point.visitors;
      current.push(point);
    } else if (point.day >= prevFrom && point.day <= prevTo) {
      prevViews += point.views;
      prevVisitors += point.visitors;
    }
  }

  let hasData = rows.length > 0;
  if (!hasData) {
    const [any] = await db.select({ day: trafficDaily.day }).from(trafficDaily).where(eq(trafficDaily.siteId, siteId)).limit(1);
    hasData = Boolean(any);
  }

  return { days, views, visitors, prevViews, prevVisitors, series: fillSeries(from, to, current), hasData };
}

/**
 * Topplista för en dimension under perioden. `share` = andel av periodens
 * totala visningar för dimensionen (0–1), även när listan är avkortad.
 */
export async function getTrafficBreakdown(
  siteId: string,
  days: 7 | 30,
  dim: TrafficDim,
  limit = 8,
): Promise<TrafficBreakdownRow[]> {
  const { from, to } = periods(days);
  const viewsSum = sql<number>`sum(${trafficDailyDims.views})::int`;
  const rows = await db
    .select({
      value: trafficDailyDims.value,
      views: viewsSum,
      total: sql<number>`sum(sum(${trafficDailyDims.views})) over ()::int`,
    })
    .from(trafficDailyDims)
    .where(
      and(
        eq(trafficDailyDims.siteId, siteId),
        eq(trafficDailyDims.dim, dim),
        gte(trafficDailyDims.day, from),
        lte(trafficDailyDims.day, to),
      ),
    )
    .groupBy(trafficDailyDims.value)
    .orderBy(desc(viewsSum), trafficDailyDims.value)
    .limit(Math.max(1, Math.min(100, limit)));

  return rows.map((row) => {
    const views = Number(row.views);
    const total = Number(row.total);
    return { value: row.value, views, share: total > 0 ? views / total : 0 };
  });
}

/** För listor: besökare per dag (7 dagar) för många sajter i en query. */
export async function getVisitorSeriesForSites(siteIds: string[], days = 7): Promise<Map<string, DayPoint[]>> {
  const result = new Map<string, DayPoint[]>();
  const ids = Array.from(new Set(siteIds.filter(Boolean)));
  if (ids.length === 0) return result;
  const { from, to } = periods(days);
  const rows = await db
    .select({ siteId: trafficDaily.siteId, day: trafficDaily.day, views: trafficDaily.views, visitors: trafficDaily.visitors })
    .from(trafficDaily)
    .where(and(inArray(trafficDaily.siteId, ids), gte(trafficDaily.day, from), lte(trafficDaily.day, to)));

  const bySite = new Map<string, DayPoint[]>();
  for (const row of rows) {
    const list = bySite.get(row.siteId) ?? [];
    list.push({ day: String(row.day), views: Number(row.views), visitors: Number(row.visitors) });
    bySite.set(row.siteId, list);
  }
  for (const id of ids) result.set(id, fillSeries(from, to, bySite.get(id) ?? []));
  return result;
}

/** Raderar `traffic_visitors` äldre än 2 dagar (day < idag − 2). Returnerar antal rader. */
export async function purgeOldVisitors(now: Date = new Date()): Promise<number> {
  const cutoff = shiftDay(utcDay(now), -2);
  const deleted = await db.delete(trafficVisitors).where(lt(trafficVisitors.day, cutoff)).returning({ day: trafficVisitors.day });
  return deleted.length;
}
