import assert from "node:assert/strict";
import { addDays, emptySeries, seriesDays, startOfStockholmDay, stockholmDay, STATS_VERSION } from "../lib/stats/contract";
import { buildSeries, buildSiteStats, sumFrom, STATS_SITE_SLUGS } from "../lib/stats/build";

assert.equal(STATS_VERSION, 1);
assert.deepEqual([...STATS_SITE_SLUGS], ["jjbygg"]);

// --- Stockholm-dag ---
// 22:30 UTC 23 okt (sommartid, +2) är redan 24 okt i Stockholm.
assert.equal(stockholmDay(new Date("2026-10-23T22:30:00Z")), "2026-10-24");
assert.equal(stockholmDay(new Date("2026-10-23T21:59:59Z")), "2026-10-23");
// Vintertid (+1): 23:30 UTC 15 jan är 16 jan i Stockholm.
assert.equal(stockholmDay(new Date("2026-01-15T23:30:00Z")), "2026-01-16");

// --- Start av Stockholm-dag i UTC ---
assert.equal(startOfStockholmDay("2026-07-01").toISOString(), "2026-06-30T22:00:00.000Z");
assert.equal(startOfStockholmDay("2026-01-15").toISOString(), "2026-01-14T23:00:00.000Z");
// Dagen sommartiden tar slut (25 okt 2026): midnatt är fortfarande +2.
assert.equal(startOfStockholmDay("2026-10-25").toISOString(), "2026-10-24T22:00:00.000Z");
assert.equal(startOfStockholmDay("2026-10-26").toISOString(), "2026-10-25T23:00:00.000Z");

// --- addDays över månads-/årsskifte ---
assert.equal(addDays("2026-03-01", -1), "2026-02-28");
assert.equal(addDays("2025-12-31", 1), "2026-01-01");

// --- 31 dagar, stigande, sista = idag (Stockholm) ---
const now = new Date("2026-10-23T22:30:00Z");
const days = seriesDays(now);
assert.equal(days.length, 31);
assert.equal(days[30], "2026-10-24");
assert.equal(days[0], "2026-09-24");
for (let i = 1; i < days.length; i++) assert.equal(days[i], addDays(days[i - 1], 1));
const empty = emptySeries(now);
assert.equal(empty.length, 31);
assert.ok(empty.every((p) => p.value === 0));

// --- buildSeries: noll-fyllning, dubbletter summeras, utanför intervallet ignoreras ---
const s = buildSeries("quotes", "Offertförfrågningar", days, [
  { day: "2026-10-24", n: 2 },
  { day: "2026-10-24", n: 1 },
  { day: "2026-10-01", n: 4 },
  { day: "2026-09-23", n: 99 }, // före intervallet
  { day: "2026-10-25", n: 99 }, // efter
]);
assert.equal(s.points.length, 31);
assert.equal(s.unit, "count");
assert.equal(s.points[30].value, 3);
assert.equal(s.points.find((p) => p.day === "2026-10-01")?.value, 4);
assert.equal(s.points.reduce((sum, p) => sum + p.value, 0), 7);

// --- sumFrom ---
assert.equal(sumFrom([{ day: "2026-10-17", n: 5 }, { day: "2026-10-18", n: 2 }, { day: "2026-10-23", n: "3" as unknown as number }], "2026-10-18"), 5);

// --- buildSiteStats: form enligt kontraktet ---
const site = buildSiteStats(days, {
  quotesTotal: 12,
  quotesNew: 3,
  quotes7d: 2,
  quotes30d: 6,
  visitors7d: 140,
  quoteDays: [{ day: "2026-10-20", n: 2 }],
  visitorDays: [{ day: "2026-10-23", n: 40 }],
});
assert.equal(site.users, null);
assert.deepEqual(site.kpis.map((k) => k.key), ["quotes_total", "quotes_new_status", "quotes_7d", "quotes_30d", "visitors_7d"]);
assert.deepEqual(site.kpis.map((k) => k.value), [12, 3, 2, 6, 140]);
assert.deepEqual(site.series.map((x) => x.key), ["quotes", "visitors"]);
assert.ok(site.series.every((x) => x.points.length === 31));
assert.equal(site.series[0].points.find((p) => p.day === "2026-10-20")?.value, 2);
assert.equal(site.series[1].points.find((p) => p.day === "2026-10-23")?.value, 40);
assert.ok(!JSON.stringify(site).includes("@"));

console.log("stats-test: OK");
