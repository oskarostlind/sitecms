/**
 * Datum- och namnformatering för panelen (svenska, Europe/Stockholm).
 * Alla funktioner tar `Date | string | null | undefined` och returnerar
 * "Aldrig" när värdet saknas eller är ogiltigt.
 */

type DateInput = Date | string | null | undefined;

const LOCALE = "sv-SE";
const TIME_ZONE = "Europe/Stockholm";
const NEVER = "Aldrig";

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: TIME_ZONE,
});

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: TIME_ZONE,
});

/** "3 mars 2026" */
export function formatDate(value: DateInput): string {
  const date = toDate(value);
  return date ? dateFormatter.format(date) : NEVER;
}

/** "3 mars 2026 14:32" */
export function formatDateTime(value: DateInput): string {
  const date = toDate(value);
  return date ? dateTimeFormatter.format(date).replace(" kl. ", " ") : NEVER;
}

/** Kalenderdag (YYYY-MM-DD) i svensk tid – för att avgöra "i går". */
function dayKey(date: Date): string {
  return dayKeyFormatter.format(date);
}

/**
 * "nyss", "för 5 min sedan", "för 2 timmar sedan", "i går 14:32",
 * annars `formatDate`. Datum i framtiden visas som fullt datum.
 */
export function relativeTime(value: DateInput, now: Date = new Date()): string {
  const date = toDate(value);
  if (!date) return NEVER;

  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) {
    // Liten klockskillnad mellan server och klient → "nyss".
    return diffMs > -60_000 ? "nyss" : formatDate(date);
  }

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "nyss";
  if (minutes < 60) return `för ${minutes} min sedan`;

  const today = dayKey(now);
  const yesterday = dayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const key = dayKey(date);

  const hours = Math.floor(minutes / 60);
  if (key === today) {
    return hours === 1 ? "för 1 timme sedan" : `för ${hours} timmar sedan`;
  }
  if (key === yesterday) return `i går ${timeFormatter.format(date)}`;

  return formatDate(date);
}

/** "Anna-Karin Svensson" → "AS", "info@firma.se" → "IN", "" → "?" */
export function initials(name: string | null | undefined): string {
  const cleaned = (name ?? "").trim();
  if (!cleaned) return "?";
  const base = cleaned.includes("@") ? cleaned.split("@")[0] : cleaned;
  const parts = base.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
