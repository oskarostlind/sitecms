/**
 * Skydd för jsonb-fälten i `seo_scores` när de läses tillbaka. Raderna skrivs
 * bara av runSeoScore, men ett handredigerat eller trasigt värde får aldrig
 * krascha panelen (översikten kör `findings.filter` direkt på resultatet).
 * Rena funktioner utan db — testas i scripts/seo-score-test.ts.
 */

import type { Finding, FindingSeverity, LighthouseResult } from "./types";

const SEVERITIES: ReadonlySet<string> = new Set<FindingSeverity>(["high", "medium", "low"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function optionalNumber(value: unknown): number | null {
  return isFiniteNumber(value) ? value : null;
}

/** Behåller bara element med `id`, `title` (strängar) och `points` (tal); fyller i saknad/okänd severity. */
export function sanitizeFindings(value: unknown): Finding[] {
  if (!Array.isArray(value)) return [];
  const out: Finding[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    if (typeof item.id !== "string" || typeof item.title !== "string" || !isFiniteNumber(item.points)) continue;
    const finding: Finding = {
      id: item.id,
      title: item.title,
      points: item.points,
      severity: typeof item.severity === "string" && SEVERITIES.has(item.severity) ? (item.severity as FindingSeverity) : "low",
    };
    if (typeof item.detail === "string") finding.detail = item.detail;
    if (typeof item.href === "string") finding.href = item.href;
    if (isFiniteNumber(item.count)) finding.count = item.count;
    out.push(finding);
  }
  return out;
}

/** Null om värdet saknas eller inte har de fyra kategoripoängen som tal. */
export function sanitizeLighthouse(value: unknown): LighthouseResult | null {
  if (!isRecord(value)) return null;
  const { performance, seo, accessibility, bestPractices } = value;
  if (!isFiniteNumber(performance) || !isFiniteNumber(seo) || !isFiniteNumber(accessibility) || !isFiniteNumber(bestPractices)) {
    return null;
  }
  return {
    performance,
    seo,
    accessibility,
    bestPractices,
    lcpMs: optionalNumber(value.lcpMs),
    cls: optionalNumber(value.cls),
    inpMs: optionalNumber(value.inpMs),
    strategy: "mobile",
    fetchedAt: typeof value.fetchedAt === "string" ? value.fetchedAt : "",
    url: typeof value.url === "string" ? value.url : "",
  };
}
