import type { QuoteStatus } from "@/lib/db/schema";

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

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Stockholm",
  }).format(d);
}
