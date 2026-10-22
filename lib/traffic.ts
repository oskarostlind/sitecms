/**
 * Trafik (docs/SEO-TRAFIK.md §4): skrivning från events-routen och läsning
 * för panelen. Bara dagsaggregat per sajt + en kortlivad besökartabell som
 * enbart finns för att räkna unika (töms av cronen via `purgeOldVisitors`).
 *
 * Fungerar med båda db-drivrutinerna: `db.batch` används när den finns
 * (neon-http), annars körs frågorna i tur och ordning (pg lokalt).
 */
import { and, desc, eq, gte, inArray, lt, lte, ne, sql } from "drizzle-orm";
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
/**
 * Max distinkta värden per dimension, sajt och dag (§2 för `path`; samma tak
 * för `source`, vars värden också styrs av besökaren). Därefter bokförs
 * överskottet på en samlingsrad (`/…` resp. `ref:…`), som inte räknas in.
 */
export const MAX_VALUES_PER_DIM_PER_DAY = 500;
/** Bakåtkompatibelt namn. */
export const MAX_PATHS_PER_DAY = MAX_VALUES_PER_DIM_PER_DAY;
/** Samlingsrad för källor när taket är nått. */
export const OVERFLOW_SOURCE = "ref:…";

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

/**
 * Begränsar antalet distinkta värden för en dimension till
 * MAX_VALUES_PER_DIM_PER_DAY per sajt och dag. Värden som redan har en rad i
 * dag släpps alltid igenom; nya värden får plats tills taket är nått och
 * bokförs därefter på `overflow`-raden. Två frågor (en batch på neon-http):
 * count(*) på dagens rader (utan samlingsraden) och vilka av de inkommande
 * värdena som redan finns — aldrig alla dagens rader.
 */
async function capDimValues(
  siteId: string,
  day: string,
  dim: TrafficDim,
  counts: Map<string, number>,
  overflow: string,
): Promise<Map<string, number>> {
  const incoming = Array.from(counts.keys()).filter((value) => value !== overflow);
  if (incoming.length === 0) return counts;

  const scope = and(eq(trafficDailyDims.siteId, siteId), eq(trafficDailyDims.day, day), eq(trafficDailyDims.dim, dim));
  const [countRows, existingRows] = (await runAll([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(trafficDailyDims)
      .where(and(scope, ne(trafficDailyDims.value, overflow))),
    db.select({ value: trafficDailyDims.value }).from(trafficDailyDims).where(and(scope, inArray(trafficDailyDims.value, incoming))),
  ])) as [{ n: number }[], { value: string }[]];

  let used = Number(countRows[0]?.n ?? 0);
  const existing = new Set(existingRows.map((r) => r.value));
  const capped = new Map<string, number>();
  for (const [value, views] of counts) {
    if (value === overflow || existing.has(value)) {
      bump(capped, value, views);
    } else if (used < MAX_VALUES_PER_DIM_PER_DAY) {
      used += 1;
      bump(capped, value, views);
    } else {
      bump(capped, overflow, views);
    }
  }
  return capped;
}

// ---------------------------------------------------------------------------
// Skrivning
// ---------------------------------------------------------------------------

/**
 * Bokför sidvisningar för UTC-dagen `day` (default i dag). Anroparen skickar
 * samma dag som besökarhashen bands till, så hash och rad aldrig glider isär
 * runt midnatt. Tre steg:
 *
 * 1. Upsert i `traffic_visitors` per besökarhash (RETURNING views). Returen
 *    avslöjar om besökaren är ny i dag (visitors +1) och hur många av
 *    besökarens visningar som ryms under taket på 100/dag — resten ignoreras.
 * 2. Tak på 500 distinkta värden för `path` och `source` (`capDimValues`);
 *    överskott bokförs som `/…` resp. `ref:…`. Land och enhet är ändliga.
 * 3. En upsert i `traffic_daily` och en i `traffic_daily_dims` (alla
 *    dimensioner på en gång) med de visningar som räknas.
 */
export async function recordPageviews(siteId: string, events: NormalizedEvent[], day: string = utcDay()): Promise<void> {
  if (events.length === 0) return;

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

  // 2. Aggregera per dimension och begränsa path/source till 500 värden per dag.
  const dims: Record<TrafficDim, Map<string, number>> = {
    path: new Map(),
    source: new Map(),
    country: new Map(),
    device: new Map(),
  };
  for (const event of accepted) {
    bump(dims.path, event.path);
    bump(dims.source, event.source);
    bump(dims.country, event.country);
    bump(dims.device, event.device);
  }
  dims.path = await capDimValues(siteId, day, "path", dims.path, OVERFLOW_PATH);
  dims.source = await capDimValues(siteId, day, "source", dims.source, OVERFLOW_SOURCE);

  const dimRows: { siteId: string; day: string; dim: TrafficDim; value: string; views: number }[] = [];
  for (const dim of Object.keys(dims) as TrafficDim[]) {
    for (const [value, views] of dims[dim]) dimRows.push({ siteId, day, dim, value, views });
  }

  // 3. Skriv aggregaten.
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
  // Både neon-http (NeonHttpQueryResult) och pg (QueryResult) exponerar rowCount.
  const result = (await db.delete(trafficVisitors).where(lt(trafficVisitors.day, cutoff))) as unknown as {
    rowCount?: number | null;
  } | null;
  const rowCount = Number(result?.rowCount ?? 0);
  return Number.isFinite(rowCount) && rowCount > 0 ? rowCount : 0;
}
