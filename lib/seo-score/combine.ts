/**
 * Viktningen (docs/SEO-TRAFIK.md §6). Rena funktioner utan db så att de kan
 * testas med `npm run test:seo`; lib/seo-score/index.ts re-exporterar dem.
 */

import type { LighthouseResult } from "./types";

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Totalpoäng: `round(content*0.6 + lighthouse*0.4)` när Lighthouse finns,
 * annars innehållspoängen. `tech` är reserverad (null) och räknas inte in.
 */
export function combineScore(content: number, lighthouse: number | null, _tech: number | null): number {
  if (lighthouse === null || lighthouse === undefined) return clamp(content);
  return clamp(content * 0.6 + lighthouse * 0.4);
}

/** Lighthouse-delpoäng: `round(seo*0.5 + performance*0.3 + accessibility*0.2)`. */
export function lighthouseSubScore(
  lighthouse: Pick<LighthouseResult, "seo" | "performance" | "accessibility">,
): number {
  return clamp(lighthouse.seo * 0.5 + lighthouse.performance * 0.3 + lighthouse.accessibility * 0.2);
}
