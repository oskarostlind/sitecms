/**
 * Turns a title into a URL-friendly slug. Shared by client-side live preview
 * (as the user types a title) and the server actions that persist it, so the
 * two always agree on the result. Uses NFD normalization plus the Unicode
 * combining-diacritical-marks range so accented Swedish letters fold down to
 * their plain ASCII base letter before the slug is built.
 */
const COMBINING_MARKS = /[\u0300-\u036f]/g;

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}
