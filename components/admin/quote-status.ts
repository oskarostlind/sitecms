import type { QuoteCustomerType, QuoteStatus } from "@/lib/db/schema";

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  ny: "Ny",
  besvarad: "Besvarad",
  arkiverad: "Arkiverad",
};

export const QUOTE_STATUS_CLASS: Record<QuoteStatus, string> = {
  ny: "bg-amber-100 text-amber-800",
  besvarad: "bg-green-100 text-green-800",
  arkiverad: "bg-neutral-200 text-neutral-600",
};

export const QUOTE_CUSTOMER_TYPE_LABEL: Record<QuoteCustomerType, string> = {
  privat: "Privat",
  foretag: "Företag",
};

/** "Ja" / "Nej" / "–" for the optional ROT flag. */
export function formatRot(rot: boolean | null | undefined): string {
  return rot === true ? "Ja" : rot === false ? "Nej" : "–";
}

/** "Luleå (972 31)", "Luleå", "972 31" or "" depending on what was given. */
export function formatPlace(location: string | null, postalCode: string | null): string {
  if (location && postalCode) return `${location} (${postalCode})`;
  return location || postalCode || "";
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Stockholm",
  }).format(d);
}
