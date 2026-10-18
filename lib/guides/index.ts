import type { Guide, GuideAudience } from "./types";
import { WAVE_1 } from "./content";

/**
 * Alla publicerade guider. Släpps i vågor — lägg nya guider i content/ och i
 * listan i content/index.ts. Ordningen styr ordningen på /guider.
 */
export const GUIDES: Guide[] = [...WAVE_1];

const bySlug = new Map(GUIDES.map((g) => [g.slug, g]));

export function getGuide(slug: string): Guide | undefined {
  return bySlug.get(slug);
}

export function guidesFor(audience: GuideAudience): Guide[] {
  return GUIDES.filter((g) => g.audience === audience);
}

/** Relaterade guider i angiven ordning; okända slugs hoppas över. */
export function relatedGuides(guide: Guide): Guide[] {
  return guide.related.map((s) => bySlug.get(s)).filter((g): g is Guide => Boolean(g) && g!.slug !== guide.slug);
}
