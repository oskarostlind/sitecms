/**
 * Innehållspoängen (docs/SEO-TRAFIK.md §6, nivå 1). Ren funktion på CMS-data:
 * ingen db, inget nätverk, så den kan testas med `npm run test:seo` och köras
 * direkt vid render i panelen när ingen dagsrad finns ännu.
 *
 * Start 100, varje regel drar poäng när den slår (med tak per regel), golv 0.
 */

import { markdownToPlainText } from "@/lib/markdown";
import type { ContentResult, Finding, FindingSeverity } from "./types";

// ---------------------------------------------------------------------------
// Indata (lib/seo-score/content-load.ts fyller den från db)
// ---------------------------------------------------------------------------

export type ContentBlockInput = {
  pageId: string;
  /** "text" | "richtext" | "image" (blocks.type). */
  type: string;
  value: string | null;
  alt: string | null;
};

export type ContentPageInput = {
  id: string;
  slug: string;
  title: string;
  blocks: ContentBlockInput[];
};

export type ContentSeoMetaInput = {
  id: string;
  pageSlug: string;
  title: string | null;
  description: string | null;
  ogImage: string | null;
};

export type ContentPostInput = {
  id: string;
  published: boolean;
  publishedAt: Date | string | null;
  coverImage: string | null;
  coverImageAlt: string | null;
};

export type ContentInput = {
  pages: ContentPageInput[];
  seoMeta: ContentSeoMetaInput[];
  posts: ContentPostInput[];
  /** Tidpunkt för beräkningen (default: nu). Styr `posts.stale` och `checkedAt`. */
  now?: Date;
};

// ---------------------------------------------------------------------------
// Gränsvärden
// ---------------------------------------------------------------------------

export const TITLE_MIN = 30;
export const TITLE_MAX = 60;
export const DESCRIPTION_MIN = 70;
export const DESCRIPTION_MAX = 155;
export const THIN_CONTENT_WORDS = 300;
export const STALE_POSTS_DAYS = 90;

/** Slugar som alla betyder startsidan. */
const HOME_SLUGS = new Set(["", "/", "home", "start"]);

// ---------------------------------------------------------------------------
// Hjälpare
// ---------------------------------------------------------------------------

function isBlank(value: string | null | undefined): boolean {
  return !value || value.trim() === "";
}

/** "/Om-oss/" → "om-oss"; startsidans varianter → "". */
export function normalizeSlug(slug: string | null | undefined): string {
  const trimmed = (slug ?? "").trim().toLowerCase().replace(/^\/+|\/+$/g, "");
  return HOME_SLUGS.has(trimmed) ? "" : trimmed;
}

/**
 * Antal ord i ett text-/richtext-block. Markdown-syntax och eventuell HTML
 * strippas först så att `**`, `#` och taggar inte räknas som ord.
 */
export function countWords(value: string | null | undefined): number {
  if (!value) return 0;
  const plain = markdownToPlainText(value.replace(/<[^>]+>/g, " "));
  if (!plain) return 0;
  return plain.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

function severityFor(maxPoints: number): FindingSeverity {
  if (maxPoints >= 12) return "high";
  if (maxPoints >= 6) return "medium";
  return "low";
}

/** "1 sida" / "3 sidor" — svensk singular/plural. */
function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function toTime(value: Date | string | null): number | null {
  if (!value) return null;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

type RuleHit = {
  id: string;
  title: string;
  detail?: string;
  href?: string;
  count?: number;
  /** Poäng per träff. */
  perHit: number;
  /** Tak för regeln (= perHit när regeln bara kan slå en gång). */
  cap: number;
};

function toFinding(hit: RuleHit): Finding {
  const raw = (hit.count ?? 1) * hit.perHit;
  const points = Math.min(raw, hit.cap);
  const finding: Finding = {
    id: hit.id,
    severity: severityFor(hit.cap),
    title: hit.title,
    points,
  };
  if (hit.detail) finding.detail = hit.detail;
  if (hit.href) finding.href = hit.href;
  if (hit.count !== undefined) finding.count = hit.count;
  return finding;
}

// ---------------------------------------------------------------------------
// Poängen
// ---------------------------------------------------------------------------

export function scoreContent(input: ContentInput): ContentResult {
  const now = input.now ?? new Date();
  const hits: RuleHit[] = [];

  const seo = input.seoMeta;

  // --- seo.title.missing -----------------------------------------------------
  const titleMissing = seo.filter((row) => isBlank(row.title));
  if (titleMissing.length > 0) {
    hits.push({
      id: "seo.title.missing",
      title: `${plural(titleMissing.length, "sida", "sidor")} saknar SEO-titel`,
      detail: "Titeln är det Google visar som rubrik i sökresultatet.",
      href: titleMissing.length === 1 ? `/seo/${titleMissing[0].id}` : "/seo",
      count: titleMissing.length,
      perHit: 6,
      cap: 18,
    });
  }

  // --- seo.title.length ------------------------------------------------------
  const titleLength = seo.filter((row) => {
    if (isBlank(row.title)) return false;
    const len = row.title!.trim().length;
    return len < TITLE_MIN || len > TITLE_MAX;
  });
  if (titleLength.length > 0) {
    hits.push({
      id: "seo.title.length",
      title:
        titleLength.length === 1
          ? "1 sida har en SEO-titel med fel längd"
          : `${titleLength.length} sidor har SEO-titlar med fel längd`,
      detail: `Titeln bör vara ${TITLE_MIN}–${TITLE_MAX} tecken så att den inte klipps i Google.`,
      href: titleLength.length === 1 ? `/seo/${titleLength[0].id}` : "/seo",
      count: titleLength.length,
      perHit: 2,
      cap: 8,
    });
  }

  // --- seo.description.missing ----------------------------------------------
  const descriptionMissing = seo.filter((row) => isBlank(row.description));
  if (descriptionMissing.length > 0) {
    hits.push({
      id: "seo.description.missing",
      title: `${plural(descriptionMissing.length, "sida", "sidor")} saknar SEO-beskrivning`,
      detail: "Beskrivningen är texten under rubriken i Google och avgör om folk klickar.",
      href: "/seo",
      count: descriptionMissing.length,
      perHit: 6,
      cap: 18,
    });
  }

  // --- seo.description.length -----------------------------------------------
  const descriptionLength = seo.filter((row) => {
    if (isBlank(row.description)) return false;
    const len = row.description!.trim().length;
    return len < DESCRIPTION_MIN || len > DESCRIPTION_MAX;
  });
  if (descriptionLength.length > 0) {
    hits.push({
      id: "seo.description.length",
      title:
        descriptionLength.length === 1
          ? "1 sida har en SEO-beskrivning med fel längd"
          : `${descriptionLength.length} sidor har SEO-beskrivningar med fel längd`,
      detail: `Beskrivningen bör vara ${DESCRIPTION_MIN}–${DESCRIPTION_MAX} tecken.`,
      href: descriptionLength.length === 1 ? `/seo/${descriptionLength[0].id}` : "/seo",
      count: descriptionLength.length,
      perHit: 2,
      cap: 8,
    });
  }

  // --- seo.title.duplicate ---------------------------------------------------
  const titleGroups = new Map<string, number>();
  for (const row of seo) {
    if (isBlank(row.title)) continue;
    const key = row.title!.trim().toLowerCase();
    titleGroups.set(key, (titleGroups.get(key) ?? 0) + 1);
  }
  let duplicates = 0;
  for (const size of titleGroups.values()) {
    if (size > 1) duplicates += size - 1;
  }
  if (duplicates > 0) {
    hits.push({
      id: "seo.title.duplicate",
      title:
        duplicates === 1
          ? "1 sida har samma SEO-titel som en annan sida"
          : `${duplicates} sidor har samma SEO-titel som andra sidor`,
      detail: "Varje sida bör ha en egen titel så att Google kan skilja dem åt.",
      href: "/seo",
      count: duplicates,
      perHit: 4,
      cap: 8,
    });
  }

  // --- seo.pages.uncovered ---------------------------------------------------
  const coveredSlugs = new Set(seo.map((row) => normalizeSlug(row.pageSlug)));
  const uncovered = input.pages.filter((page) => !coveredSlugs.has(normalizeSlug(page.slug)));
  if (uncovered.length > 0) {
    hits.push({
      id: "seo.pages.uncovered",
      title: `${plural(uncovered.length, "sida", "sidor")} saknar SEO-inställningar`,
      detail: "Sidor utan titel och beskrivning får Googles egna gissningar i sökresultatet.",
      href: "/seo",
      count: uncovered.length,
      perHit: 4,
      cap: 12,
    });
  }

  // --- seo.ogimage.missing ---------------------------------------------------
  const homeRow = seo.find((row) => normalizeSlug(row.pageSlug) === "");
  if (homeRow && isBlank(homeRow.ogImage)) {
    hits.push({
      id: "seo.ogimage.missing",
      title: "Startsidan saknar delningsbild (og-bild)",
      detail: "Bilden visas när sajten delas på sociala medier och i meddelanden.",
      href: `/seo/${homeRow.id}`,
      perHit: 4,
      cap: 4,
    });
  }

  // --- images.alt.missing (samma villkor som översikten) ---------------------
  const altMissingPages = new Map<string, number>();
  for (const page of input.pages) {
    for (const block of page.blocks) {
      if (block.type !== "image") continue;
      if (isBlank(block.value)) continue;
      if (!isBlank(block.alt)) continue;
      altMissingPages.set(block.pageId, (altMissingPages.get(block.pageId) ?? 0) + 1);
    }
  }
  let altMissing = 0;
  for (const count of altMissingPages.values()) altMissing += count;
  if (altMissing > 0) {
    const pageIds = [...altMissingPages.keys()];
    hits.push({
      id: "images.alt.missing",
      title: `${plural(altMissing, "bild", "bilder")} saknar beskrivning (alt-text)`,
      detail: "Alt-texten hjälper Google att förstå bilden och läses upp för den som inte ser den.",
      href: pageIds.length === 1 ? `/pages/${pageIds[0]}` : "/pages",
      count: altMissing,
      perHit: 2,
      cap: 12,
    });
  }

  // --- posts.cover.alt.missing -----------------------------------------------
  const coverAltMissing = input.posts.filter(
    (post) => post.published && !isBlank(post.coverImage) && isBlank(post.coverImageAlt),
  );
  if (coverAltMissing.length > 0) {
    hits.push({
      id: "posts.cover.alt.missing",
      title:
        coverAltMissing.length === 1
          ? "1 inlägg har en omslagsbild utan alt-text"
          : `${coverAltMissing.length} inlägg har omslagsbilder utan alt-text`,
      detail: "Beskriv vad omslagsbilden visar så att den räknas i bildsök.",
      href: coverAltMissing.length === 1 ? `/posts/${coverAltMissing[0].id}` : "/posts",
      count: coverAltMissing.length,
      perHit: 1,
      cap: 4,
    });
  }

  // --- content.thin ----------------------------------------------------------
  const thinPages = input.pages.filter((page) => {
    let words = 0;
    for (const block of page.blocks) {
      if (block.type === "text" || block.type === "richtext") words += countWords(block.value);
    }
    return words < THIN_CONTENT_WORDS;
  });
  if (thinPages.length > 0) {
    hits.push({
      id: "content.thin",
      title: `${plural(thinPages.length, "sida", "sidor")} har lite text (under ${THIN_CONTENT_WORDS} ord)`,
      detail: "Sidor med mer beskrivande text rankar bättre och svarar på fler sökningar.",
      href: thinPages.length === 1 ? `/pages/${thinPages[0].id}` : "/pages",
      count: thinPages.length,
      perHit: 3,
      cap: 9,
    });
  }

  // --- posts.stale / posts.none ---------------------------------------------
  if (input.posts.length === 0) {
    hits.push({
      id: "posts.none",
      title: "Sajten har inga inlägg ännu",
      detail: "Nyheter och projekt ger Google nytt innehåll att indexera.",
      href: "/posts/new",
      perHit: 3,
      cap: 3,
    });
  } else {
    const cutoff = now.getTime() - STALE_POSTS_DAYS * 24 * 60 * 60 * 1000;
    const recent = input.posts.some((post) => {
      if (!post.published) return false;
      const time = toTime(post.publishedAt);
      return time !== null && time >= cutoff && time <= now.getTime() + 60_000;
    });
    if (!recent) {
      hits.push({
        id: "posts.stale",
        title: `Inget inlägg publicerat de senaste ${STALE_POSTS_DAYS} dagarna`,
        detail: "Regelbundna inlägg visar Google att sajten lever.",
        href: "/posts/new",
        perHit: 5,
        cap: 5,
      });
    }
  }

  const findings = hits.map(toFinding).sort((a, b) => b.points - a.points);
  const deducted = findings.reduce((sum, finding) => sum + finding.points, 0);
  const score = Math.max(0, Math.min(100, 100 - deducted));

  return { score, findings, checkedAt: now.toISOString() };
}
