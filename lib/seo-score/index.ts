/**
 * SEO-poängen (docs/SEO-TRAFIK.md §6): räknar innehållspoäng + Lighthouse,
 * upsertar dagens rad i `seo_scores` och läser tillbaka den för panelen.
 *
 *   runSeoScore(siteId)            — cron och "Räkna om"-knappen
 *   getLatestSeoScore(siteId)      — poängkortet
 *   getSeoScoreSeries(siteId, 30)  — trend
 *   getLatestScoresForSites(ids)   — "Dina sajter" (en query)
 */

import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { seoScores, sites } from "@/lib/db/schema";
import { siteUrl } from "@/lib/site-url";
import { combineScore, lighthouseSubScore } from "./combine";
import { scoreContent } from "./content";
import { loadContentInput } from "./content-load";
import { fetchPageSpeed } from "./pagespeed";
import type { Finding, LighthouseResult, SeoScore } from "./types";

export { combineScore, lighthouseSubScore } from "./combine";
export { scoreContent } from "./content";
export type { ContentInput, ContentBlockInput, ContentPageInput, ContentPostInput, ContentSeoMetaInput } from "./content";
export { loadContentInput } from "./content-load";
export { fetchPageSpeed } from "./pagespeed";
export type { ContentResult, Finding, FindingSeverity, LighthouseResult, SeoScore } from "./types";

/** Dagens datum i UTC som YYYY-MM-DD (matchar `day`-kolumnen). */
export function utcDay(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

type SeoScoreRow = typeof seoScores.$inferSelect;

function toSeoScore(row: SeoScoreRow): SeoScore {
  return {
    day: String(row.day),
    score: row.score,
    contentScore: row.contentScore,
    lighthouseScore: row.lighthouseScore ?? null,
    techScore: row.techScore ?? null,
    findings: (row.findings ?? []) as Finding[],
    lighthouse: (row.lighthouse ?? null) as LighthouseResult | null,
    createdAt: new Date(row.createdAt),
  };
}

export type RunSeoScoreOptions = {
  /** Hoppa över PageSpeed helt (content-only). */
  skipPageSpeed?: boolean;
  /** Avbryter PageSpeed-anropet (t.ex. cronens deadline). Avbrott ⇒ lighthouse null, aldrig fel. */
  signal?: AbortSignal;
};

/**
 * Räknar poängen för en sajt och upsertar dagens rad (`ON CONFLICT (site_id,
 * day) DO UPDATE`). Sajter utan domän, och `skipPageSpeed`, ger
 * `lighthouse: null` och poängen räknas på innehållet enbart. PSI-fel kastar
 * aldrig (fetchPageSpeed returnerar null).
 */
export async function runSeoScore(siteId: string, opts: RunSeoScoreOptions = {}): Promise<SeoScore> {
  const [site] = await db
    .select({ id: sites.id, domain: sites.domain })
    .from(sites)
    .where(eq(sites.id, siteId))
    .limit(1);
  if (!site) {
    throw new Error(`runSeoScore: sajten ${siteId} finns inte`);
  }

  const url = siteUrl(site.domain);
  const [content, lighthouse] = await Promise.all([
    loadContentInput(siteId).then(scoreContent),
    opts.skipPageSpeed || !url
      ? Promise.resolve<LighthouseResult | null>(null)
      : fetchPageSpeed(url, { signal: opts.signal }),
  ]);

  const lighthouseScore = lighthouse ? lighthouseSubScore(lighthouse) : null;
  const techScore: number | null = null;
  const score = combineScore(content.score, lighthouseScore, techScore);
  const day = utcDay();

  const [row] = await db
    .insert(seoScores)
    .values({
      siteId,
      day,
      score,
      contentScore: content.score,
      lighthouseScore,
      techScore,
      findings: content.findings,
      lighthouse,
    })
    .onConflictDoUpdate({
      target: [seoScores.siteId, seoScores.day],
      set: {
        score,
        contentScore: content.score,
        lighthouseScore,
        techScore,
        findings: content.findings,
        lighthouse,
        updatedAt: sql`now()`,
      },
    })
    .returning();

  return toSeoScore(row);
}

/** Senaste raden för sajten (oavsett dag), eller null om ingen körning gjorts. */
export async function getLatestSeoScore(siteId: string): Promise<SeoScore | null> {
  const [row] = await db
    .select()
    .from(seoScores)
    .where(eq(seoScores.siteId, siteId))
    .orderBy(desc(seoScores.day))
    .limit(1);
  return row ? toSeoScore(row) : null;
}

/** Poäng per dag de senaste `days` dagarna (inkl. idag), stigande. Luckor utelämnas. */
export async function getSeoScoreSeries(siteId: string, days: number): Promise<{ day: string; score: number }[]> {
  const span = Math.max(1, Math.floor(days));
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - (span - 1));

  const rows = await db
    .select({ day: seoScores.day, score: seoScores.score })
    .from(seoScores)
    .where(and(eq(seoScores.siteId, siteId), gte(seoScores.day, utcDay(from))))
    .orderBy(seoScores.day);

  return rows.map((row) => ({ day: String(row.day), score: row.score }));
}

/** Senaste poängen per sajt i en query (`DISTINCT ON (site_id) … ORDER BY site_id, day DESC`). */
export async function getLatestScoresForSites(siteIds: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (siteIds.length === 0) return result;

  const rows = await db
    .selectDistinctOn([seoScores.siteId], { siteId: seoScores.siteId, score: seoScores.score })
    .from(seoScores)
    .where(inArray(seoScores.siteId, siteIds))
    .orderBy(seoScores.siteId, desc(seoScores.day));

  for (const row of rows) result.set(row.siteId, row.score);
  return result;
}

/** Dagens rad (används av runSeoScoreNow för 10-minutersspärren). */
export async function getTodaySeoScoreRow(
  siteId: string,
): Promise<{ updatedAt: Date; score: number } | null> {
  const [row] = await db
    .select({ updatedAt: seoScores.updatedAt, score: seoScores.score })
    .from(seoScores)
    .where(and(eq(seoScores.siteId, siteId), eq(seoScores.day, utcDay())))
    .limit(1);
  return row ? { updatedAt: new Date(row.updatedAt), score: row.score } : null;
}
