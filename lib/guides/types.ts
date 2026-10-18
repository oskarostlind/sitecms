/**
 * Guider: handskriven text per sida, delad renderare (components/guides).
 *
 * Inline-format i alla strängar (renderas säkert, ingen rå HTML):
 *   **fet**          → <strong>
 *   [text](/sökväg)  → intern länk (next/link)  ·  [text](https://…) → extern länk (rel="noopener")
 *   `kod`            → <code>
 */

export type GuideAudience = "smaforetag" | "utvecklare";

export type GuideBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "table"; caption?: string; head: string[]; rows: string[][] }
  | { type: "tip"; title?: string; text: string }
  | { type: "warning"; title?: string; text: string }
  | { type: "code"; lang: string; filename?: string; code: string }
  | { type: "h3"; text: string };

export type GuideSection = {
  /** Ankare, a–z och bindestreck, unikt inom guiden. */
  id: string;
  heading: string;
  blocks: GuideBlock[];
};

export type GuideFaq = { q: string; a: string };

export type GuideSource = { title: string; url: string };

export type Guide = {
  /** URL: /guider/<slug>. Svenska, a–z, 0–9 och bindestreck. */
  slug: string;
  audience: GuideAudience;
  /** <title> utan suffix. Max 50 tecken (" | sitecms" läggs till → max 60). */
  title: string;
  /** H1 — får vara längre och mer beskrivande än title. */
  h1: string;
  /** Meta description, 120–155 tecken. */
  description: string;
  /** Primär sökfråga (för egen uppföljning, renderas inte). */
  primaryQuery: string;
  /** ISO-datum. */
  published: string;
  /** ISO-datum — uppdatera när innehållet faktiskt ändras. */
  modified: string;
  /** 2–3 meningar direkt under H1 som svarar på frågan rakt. */
  intro: string[];
  /** Kort sammanfattning i punktform överst ("Kort svar"). */
  summary?: string[];
  sections: GuideSection[];
  faq: GuideFaq[];
  /** Källor för fakta, regler, priser och datum som används i texten. */
  sources?: GuideSource[];
  /** Slugs för relaterade guider (2–4). */
  related: string[];
  /** Vilken uppmaning som visas efter innehållet. */
  cta: "kund" | "utvecklare";
};

export const AUDIENCE_LABELS: Record<GuideAudience, string> = {
  smaforetag: "För småföretag",
  utvecklare: "För utvecklare",
};
