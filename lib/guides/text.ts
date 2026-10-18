import type { Guide, GuideBlock } from "./types";

/** Ren text utan inline-markup (för JSON-LD, meta och ordräkning). */
export function plainText(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, "$1");
}

function blockText(block: GuideBlock): string {
  switch (block.type) {
    case "p":
    case "h3":
      return block.text;
    case "tip":
    case "warning":
      return `${block.title ?? ""} ${block.text}`;
    case "ul":
    case "ol":
      return block.items.join(" ");
    case "table":
      return [block.caption ?? "", ...block.head, ...block.rows.flat()].join(" ");
    case "code":
      return "";
  }
}

/** All läsbar text i en guide (utan kod). */
export function guideText(guide: Guide): string {
  return plainText(
    [
      guide.h1,
      ...guide.intro,
      ...(guide.summary ?? []),
      ...guide.sections.flatMap((s) => [s.heading, ...s.blocks.map(blockText)]),
      ...guide.faq.flatMap((f) => [f.q, f.a]),
    ].join(" "),
  );
}

export function wordCount(guide: Guide): number {
  return guideText(guide).split(/\s+/).filter(Boolean).length;
}

/** Lästid i minuter (≈ 200 ord/min för svensk sakprosa). */
export function readingMinutes(guide: Guide): number {
  return Math.max(2, Math.round(wordCount(guide) / 200));
}

const dateFormatter = new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "long", year: "numeric" });

export function formatGuideDate(iso: string): string {
  return dateFormatter.format(new Date(`${iso}T12:00:00Z`));
}
