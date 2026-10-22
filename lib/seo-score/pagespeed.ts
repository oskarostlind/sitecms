/**
 * Google PageSpeed Insights v5 (docs/SEO-TRAFIK.md §6). Mobil, fyra kategorier.
 * Returnerar alltid null vid fel (timeout, kvot, ogiltigt svar) och loggar
 * orsaken med `console.warn` — kastar aldrig, så poängen kan räknas på
 * innehållet ändå.
 *
 * `PAGESPEED_API_KEY` är valfri: utan nyckel fungerar API:t med låg kvot.
 */

import type { LighthouseResult } from "./types";

export const PAGESPEED_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
export const PAGESPEED_TIMEOUT_MS = 60_000;

const CATEGORIES = ["PERFORMANCE", "SEO", "ACCESSIBILITY", "BEST_PRACTICES"] as const;

export type FetchPageSpeedOptions = {
  apiKey?: string;
  signal?: AbortSignal;
  /** Bara för tester. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

type PsiCategory = { score?: number | null };
type PsiAudit = { numericValue?: number | null };
type PsiResponse = {
  lighthouseResult?: {
    categories?: {
      performance?: PsiCategory;
      seo?: PsiCategory;
      accessibility?: PsiCategory;
      "best-practices"?: PsiCategory;
    };
    audits?: Record<string, PsiAudit | undefined>;
  };
  error?: { message?: string };
};

/** Bygger anrops-URL:en (exporterad för tester). */
export function pageSpeedUrl(url: string, apiKey?: string): string {
  const params = new URLSearchParams({ url, strategy: "mobile" });
  for (const category of CATEGORIES) params.append("category", category);
  if (apiKey) params.set("key", apiKey);
  return `${PAGESPEED_ENDPOINT}?${params.toString()}`;
}

function toScore(category: PsiCategory | undefined): number | null {
  const score = category?.score;
  if (typeof score !== "number" || !Number.isFinite(score)) return null;
  return Math.round(score * 100);
}

function toNumeric(audit: PsiAudit | undefined): number | null {
  const value = audit?.numericValue;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Plockar ut det vi lagrar ur PSI-svaret, eller null om kategorierna saknas. */
export function parsePageSpeed(data: PsiResponse, url: string, fetchedAt = new Date()): LighthouseResult | null {
  const lighthouse = data.lighthouseResult;
  const categories = lighthouse?.categories;
  if (!categories) return null;

  const performance = toScore(categories.performance);
  const seo = toScore(categories.seo);
  const accessibility = toScore(categories.accessibility);
  const bestPractices = toScore(categories["best-practices"]);
  if (performance === null || seo === null || accessibility === null || bestPractices === null) return null;

  const audits = lighthouse?.audits ?? {};
  const lcp = toNumeric(audits["largest-contentful-paint"]);
  const inp = toNumeric(audits["interaction-to-next-paint"]);

  return {
    performance,
    seo,
    accessibility,
    bestPractices,
    lcpMs: lcp === null ? null : Math.round(lcp),
    cls: toNumeric(audits["cumulative-layout-shift"]),
    inpMs: inp === null ? null : Math.round(inp),
    strategy: "mobile",
    fetchedAt: fetchedAt.toISOString(),
    url,
  };
}

export async function fetchPageSpeed(
  url: string,
  opts: FetchPageSpeedOptions = {},
): Promise<LighthouseResult | null> {
  const apiKey = opts.apiKey ?? process.env.PAGESPEED_API_KEY ?? undefined;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? PAGESPEED_TIMEOUT_MS;

  // Egen controller: timeout + eventuell yttre signal (t.ex. från cronen).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`timeout efter ${timeoutMs} ms`)), timeoutMs);
  const onOuterAbort = () => controller.abort(opts.signal?.reason ?? new Error("avbruten"));
  if (opts.signal) {
    if (opts.signal.aborted) onOuterAbort();
    else opts.signal.addEventListener("abort", onOuterAbort, { once: true });
  }

  try {
    const response = await fetchImpl(pageSpeedUrl(url, apiKey), {
      signal: controller.signal,
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      let reason = `HTTP ${response.status}`;
      try {
        const body = (await response.json()) as PsiResponse;
        if (body.error?.message) reason += ` – ${body.error.message}`;
      } catch {
        // Ingen läsbar felkropp – statusen räcker.
      }
      console.warn(`fetchPageSpeed: ${url}: ${reason}`);
      return null;
    }

    const data = (await response.json()) as PsiResponse;
    const result = parsePageSpeed(data, url);
    if (!result) {
      console.warn(`fetchPageSpeed: ${url}: svaret saknade Lighthouse-kategorier`);
    }
    return result;
  } catch (err) {
    const reason =
      controller.signal.aborted && controller.signal.reason instanceof Error
        ? controller.signal.reason.message
        : err instanceof Error
          ? err.message
          : String(err);
    console.warn(`fetchPageSpeed: ${url}: ${reason}`);
    return null;
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onOuterAbort);
  }
}
