/**
 * Typer för SEO-poängen (docs/SEO-TRAFIK.md §6). Ren modul utan db-import så
 * att schema.ts och klientkomponenter kan importera den.
 */

export type FindingSeverity = "high" | "medium" | "low";

/** Ett konkret fynd som drar poäng och som kunden kan åtgärda i panelen. */
export type Finding = {
  /** Stabil nyckel, t.ex. "seo.description.missing". */
  id: string;
  severity: FindingSeverity;
  /** Svensk rubrik med antal, t.ex. "3 sidor saknar SEO-beskrivning". */
  title: string;
  /** En mening om varför det spelar roll. */
  detail?: string;
  /** Relativ till `/admin/sites/{siteId}`, t.ex. "/seo" eller "/pages/{pageId}". */
  href?: string;
  count?: number;
  /** Hur många poäng (0–100-skalan) fyndet drar. */
  points: number;
};

export type ContentResult = { score: number; findings: Finding[]; checkedAt: string };

export type LighthouseResult = {
  performance: number;
  seo: number;
  accessibility: number;
  bestPractices: number;
  lcpMs: number | null;
  cls: number | null;
  inpMs: number | null;
  strategy: "mobile";
  fetchedAt: string;
  url: string;
};

export type SeoScore = {
  /** YYYY-MM-DD (UTC). */
  day: string;
  score: number;
  contentScore: number;
  lighthouseScore: number | null;
  techScore: number | null;
  findings: Finding[];
  lighthouse: LighthouseResult | null;
  createdAt: Date;
};
