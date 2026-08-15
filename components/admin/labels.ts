/**
 * Svenska etiketter för block-grupper (prefix före punkten i block-key,
 * t.ex. "hero" i "hero.title") och för enskilda fält. Okända
 * grupper/fält får en vettig fallback så nya block aldrig blir dolda.
 */

const GROUP_TITLES: Record<string, string> = {
  hero: "Hero-sektion",
  why: "Varför välja oss",
  cta: "Uppmaning (CTA)",
  footer: "Sidfot & kontaktuppgifter",
  faq: "Vanliga frågor",
};

const FIELD_LABELS: Record<string, string> = {
  "hero.title": "Rubrik",
  "hero.subtitle": "Underrubrik",
  "hero.image": "Bild",
  "why.item1": "Punkt 1",
  "why.item2": "Punkt 2",
  "why.item3": "Punkt 3",
  "cta.title": "Rubrik",
  "cta.subtitle": "Text",
  "footer.company": "Företagsnamn",
  "footer.orgnr": "Organisationsnummer",
  "footer.address": "Adress",
  "footer.contactName": "Kontaktperson",
  "footer.phone": "Telefon",
  "footer.email": "E-post",
  "faq.q1": "Fråga 1",
  "faq.a1": "Svar 1",
  "faq.q2": "Fråga 2",
  "faq.a2": "Svar 2",
  "faq.q3": "Fråga 3",
  "faq.a3": "Svar 3",
};

export function groupTitle(prefix: string): string {
  return (
    GROUP_TITLES[prefix] ??
    prefix.charAt(0).toUpperCase() + prefix.slice(1).replace(/[_-]/g, " ")
  );
}

function humanizeSuffix(suffix: string): string {
  // "contactName" -> "contact Name" -> "Contact name"
  const spaced = suffix.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

export function fieldLabel(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  const dotIndex = key.indexOf(".");
  const suffix = dotIndex >= 0 ? key.slice(dotIndex + 1) : key;
  return humanizeSuffix(suffix);
}

/** Sorteringsordning för kända grupper; okända grupper hamnar sist, i den
 * ordning de påträffas. */
const GROUP_ORDER = ["hero", "why", "cta", "faq", "footer"];

export function groupSortIndex(prefix: string): number {
  const idx = GROUP_ORDER.indexOf(prefix);
  return idx === -1 ? GROUP_ORDER.length : idx;
}
