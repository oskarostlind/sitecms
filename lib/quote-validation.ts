/**
 * Server-side validation for quote requests (offertförfrågningar) sent from a
 * customer site's form. The customer site validates too, but the CMS never
 * trusts it: every field is re-checked here before anything is stored.
 */

import { quoteCustomerTypeValues, type QuoteAttachment, type QuoteCustomerType } from "@/lib/db/schema";

export type { QuoteAttachment };

export type QuoteInput = {
  name: string;
  company: string | null;
  phone: string;
  email: string;
  jobType: string;
  machine: string | null;
  location: string | null;
  desiredStart: string | null;
  description: string;
  consent: boolean;
  // --- v2: optional on the wire, null when not sent ---
  customerType: QuoteCustomerType | null;
  budget: string | null;
  rot: boolean | null;
  postalCode: string | null;
  source: string | null;
  attachments: QuoteAttachment[] | null;
  extra: Record<string, string> | null;
};

export type QuoteValidationResult =
  | { ok: true; data: QuoteInput }
  | { ok: false; errors: Record<string, string> };

/** Limits shared with the docs and the npm package. */
export const QUOTE_LIMITS = {
  attachments: 10,
  attachmentUrlLength: 2048,
  attachmentNameLength: 200,
  extraKeys: 20,
  extraValueLength: 500,
  extraKeyPattern: /^[a-zA-Z0-9_.-]{1,50}$/,
  budgetLength: 100,
  postalCodeLength: 10,
  sourceLength: 500,
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIME_RE = /^[\w.+-]+\/[\w.+-]+$/;

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** true/false/null from a boolean or the usual form-string spellings; undefined when unparseable. */
function bool(value: unknown): boolean | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (["true", "on", "1", "ja", "yes"].includes(v)) return true;
    if (["false", "off", "0", "nej", "no"].includes(v)) return false;
  }
  return undefined;
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validates the `attachments` array: up to 10 objects with an https URL
 * (max 2048 chars), a file name, a MIME type and a byte size. Returns the
 * cleaned list, null when nothing was sent, or an error message.
 */
export function validateAttachments(value: unknown): { ok: true; data: QuoteAttachment[] | null } | { ok: false; error: string } {
  if (value === undefined || value === null) return { ok: true, data: null };
  if (!Array.isArray(value)) return { ok: false, error: "Bilagor måste skickas som en lista." };
  if (value.length === 0) return { ok: true, data: null };
  if (value.length > QUOTE_LIMITS.attachments) {
    return { ok: false, error: `Högst ${QUOTE_LIMITS.attachments} bilagor per förfrågan.` };
  }
  const out: QuoteAttachment[] = [];
  for (const item of value) {
    const a = (typeof item === "object" && item !== null ? item : {}) as Record<string, unknown>;
    const url = str(a.url);
    if (!url || url.length > QUOTE_LIMITS.attachmentUrlLength || !isHttpsUrl(url)) {
      return { ok: false, error: "Varje bilaga behöver en https-adress (max 2048 tecken)." };
    }
    const name = str(a.name).slice(0, QUOTE_LIMITS.attachmentNameLength) || "bilaga";
    const contentType = str(a.contentType).toLowerCase();
    if (!contentType || contentType.length > 100 || !MIME_RE.test(contentType)) {
      return { ok: false, error: "Varje bilaga behöver en giltig filtyp (contentType)." };
    }
    const size = typeof a.size === "string" && /^\d+$/.test(a.size) ? Number(a.size) : a.size;
    if (typeof size !== "number" || !Number.isSafeInteger(size) || size < 0) {
      return { ok: false, error: "Varje bilaga behöver en filstorlek i byte (size)." };
    }
    out.push({ url, name, contentType, size });
  }
  return { ok: true, data: out };
}

/**
 * Validates `extra`: an object of string → string. Keys must match
 * ^[a-zA-Z0-9_.-]{1,50}$, values are trimmed (max 500 chars) and empty values
 * are dropped. Max 20 keys after cleaning. Returns null when nothing is left.
 */
export function validateExtra(value: unknown): { ok: true; data: Record<string, string> | null } | { ok: false; error: string } {
  if (value === undefined || value === null) return { ok: true, data: null };
  if (typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Övriga uppgifter (extra) måste vara ett objekt med textvärden." };
  }
  const out: Record<string, string> = {};
  for (const [rawKey, rawValue] of Object.entries(value as Record<string, unknown>)) {
    const key = rawKey.trim();
    if (!QUOTE_LIMITS.extraKeyPattern.test(key)) {
      return { ok: false, error: `Ogiltigt fältnamn i extra: "${rawKey.slice(0, 60)}" (a–z, 0–9, punkt, bindestreck, understreck, max 50 tecken).` };
    }
    if (rawValue === undefined || rawValue === null) continue;
    if (typeof rawValue !== "string" && typeof rawValue !== "number" && typeof rawValue !== "boolean") {
      return { ok: false, error: `Värdet för "${key}" i extra måste vara text.` };
    }
    const v = String(rawValue).trim();
    if (!v) continue;
    if (v.length > QUOTE_LIMITS.extraValueLength) {
      return { ok: false, error: `Värdet för "${key}" i extra får vara högst ${QUOTE_LIMITS.extraValueLength} tecken.` };
    }
    out[key] = v;
  }
  const keys = Object.keys(out);
  if (keys.length > QUOTE_LIMITS.extraKeys) {
    return { ok: false, error: `Högst ${QUOTE_LIMITS.extraKeys} fält i extra.` };
  }
  return { ok: true, data: keys.length > 0 ? out : null };
}

/**
 * Normalises a Swedish phone number to E.164 (+46…). Accepts "070-123 45 67",
 * "0970-553 00", "+46 70 123 45 67" and "0046…". Returns null if it doesn't
 * look like a Swedish number.
 */
export function normalizeSwedishPhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-().]/g, "");
  let digits: string;
  if (/^\+46\d+$/.test(cleaned)) digits = cleaned.slice(3);
  else if (/^0046\d+$/.test(cleaned)) digits = cleaned.slice(4);
  else if (/^0\d+$/.test(cleaned)) digits = cleaned.slice(1);
  else return null;
  if (digits.startsWith("0")) return null;
  if (digits.length < 6 || digits.length > 10) return null;
  return `+46${digits}`;
}

/** Today's date (YYYY-MM-DD) in Swedish time, so "not in the past" matches what the customer sees. */
export function todayInSweden(now = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function validateQuote(body: unknown): QuoteValidationResult {
  const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const name = str(b.name);
  if (name.length < 2 || name.length > 100) errors.name = "Ange ditt namn (2–100 tecken).";

  const company = str(b.company);
  if (company.length > 100) errors.company = "Företagsnamnet får vara högst 100 tecken.";

  const phoneRaw = str(b.phone);
  const phone = normalizeSwedishPhone(phoneRaw);
  if (!phone) errors.phone = "Ange ett svenskt telefonnummer, t.ex. 070-123 45 67.";

  const email = str(b.email).toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 200) errors.email = "Ange en giltig e-postadress.";

  const jobType = str(b.jobType);
  if (!jobType || jobType.length > 100) errors.jobType = "Välj typ av uppdrag.";

  const machine = str(b.machine);
  if (machine.length > 100) errors.machine = "Ogiltigt maskinval.";

  const location = str(b.location);
  if (location.length > 100) errors.location = "Plats/ort får vara högst 100 tecken.";

  const desiredStart = str(b.desiredStart);
  if (desiredStart) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(desiredStart) || Number.isNaN(Date.parse(desiredStart))) {
      errors.desiredStart = "Ange ett giltigt datum.";
    } else if (desiredStart < todayInSweden()) {
      errors.desiredStart = "Önskad start kan inte vara bakåt i tiden.";
    }
  }

  const description = str(b.description);
  if (description.length < 10 || description.length > 3000) {
    errors.description = "Beskriv uppdraget (10–3000 tecken).";
  }

  const consent = b.consent === true || b.consent === "true" || b.consent === "on";
  if (!consent) errors.consent = "Du behöver godkänna att vi behandlar dina uppgifter.";

  // --- v2 fields: all optional, validated only when present ---
  const customerTypeRaw = str(b.customerType).toLowerCase();
  const customerType = customerTypeRaw as QuoteCustomerType;
  if (customerTypeRaw && !quoteCustomerTypeValues.includes(customerType)) {
    errors.customerType = "Kundtyp måste vara \"privat\" eller \"foretag\".";
  }

  const budget = str(b.budget);
  if (budget.length > QUOTE_LIMITS.budgetLength) errors.budget = `Budget får vara högst ${QUOTE_LIMITS.budgetLength} tecken.`;

  const rot = bool(b.rot);
  if (rot === undefined) errors.rot = "ROT-avdrag måste vara ja eller nej.";

  const postalCode = str(b.postalCode);
  if (postalCode.length > QUOTE_LIMITS.postalCodeLength) errors.postalCode = `Postnummer får vara högst ${QUOTE_LIMITS.postalCodeLength} tecken.`;

  const source = str(b.source);
  if (source.length > QUOTE_LIMITS.sourceLength) errors.source = `Leadkälla (source) får vara högst ${QUOTE_LIMITS.sourceLength} tecken.`;

  const attachments = validateAttachments(b.attachments);
  if (!attachments.ok) errors.attachments = attachments.error;

  const extra = validateExtra(b.extra);
  if (!extra.ok) errors.extra = extra.error;

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      name,
      company: company || null,
      phone: phone!,
      email,
      jobType,
      machine: machine || null,
      location: location || null,
      desiredStart: desiredStart || null,
      description,
      consent,
      customerType: customerTypeRaw ? customerType : null,
      budget: budget || null,
      rot: rot ?? null,
      postalCode: postalCode || null,
      source: source || null,
      attachments: attachments.ok ? attachments.data : null,
      extra: extra.ok ? extra.data : null,
    },
  };
}
