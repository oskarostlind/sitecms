/**
 * Server-side validation for quote requests (offertförfrågningar) sent from a
 * customer site's form. The customer site validates too, but the CMS never
 * trusts it: every field is re-checked here before anything is stored.
 */

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
};

export type QuoteValidationResult =
  | { ok: true; data: QuoteInput }
  | { ok: false; errors: Record<string, string> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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
    },
  };
}
