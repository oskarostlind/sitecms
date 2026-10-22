import { escapeHtml, sendMail, type MailResult } from "@/lib/mail";
import type { QuoteInput } from "@/lib/quote-validation";

type Row = [label: string, value: string | null];

const CUSTOMER_TYPE_LABEL = { privat: "Privat", foretag: "Företag" } as const;

function rows(q: QuoteInput): Row[] {
  return [
    ["Namn", q.name],
    ["Företag", q.company],
    ["Kundtyp", q.customerType ? CUSTOMER_TYPE_LABEL[q.customerType] : null],
    ["Telefon", q.phone],
    ["E-post", q.email],
    ["Typ av uppdrag", q.jobType],
    ["Maskin", q.machine],
    ["Plats/ort", q.location],
    ["Postnummer", q.postalCode],
    ["Önskad start", q.desiredStart],
    ["Budget", q.budget],
    ["ROT-avdrag", q.rot === true ? "Ja" : q.rot === false ? "Nej" : null],
  ];
}

const FONT = "font-family:Arial,sans-serif;font-size:14px";

function formatSize(bytes: number): string {
  if (!bytes) return "";
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} kB` : `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

function table(q: QuoteInput, { includeAttachments = false, includeSource = false } = {}): { text: string; html: string } {
  const filled = rows(q).filter(([, v]) => v);
  const extra = Object.entries(q.extra ?? {});
  const attachments = includeAttachments ? (q.attachments ?? []) : [];

  let text = filled.map(([k, v]) => `${k}: ${v}`).join("\n") + `\n\nBeskrivning:\n${q.description}`;
  let html =
    `<table cellpadding="6" style="border-collapse:collapse;${FONT}">` +
    filled
      .map(
        ([k, v]) =>
          `<tr><td style="color:#5B636B;vertical-align:top">${escapeHtml(k)}</td><td><strong>${escapeHtml(v!)}</strong></td></tr>`,
      )
      .join("") +
    `</table><p style="${FONT}"><strong>Beskrivning</strong><br>${escapeHtml(q.description).replace(/\n/g, "<br>")}</p>`;

  if (extra.length > 0) {
    text += `\n\nÖvriga uppgifter:\n` + extra.map(([k, v]) => `${k}: ${v}`).join("\n");
    html +=
      `<p style="${FONT}"><strong>Övriga uppgifter</strong></p><table cellpadding="6" style="border-collapse:collapse;${FONT}">` +
      extra
        .map(([k, v]) => `<tr><td style="color:#5B636B;vertical-align:top">${escapeHtml(k)}</td><td>${escapeHtml(v).replace(/\n/g, "<br>")}</td></tr>`)
        .join("") +
      `</table>`;
  }

  if (attachments.length > 0) {
    text += `\n\nBilagor (${attachments.length}):\n` + attachments.map((a) => `${a.name} – ${a.url}`).join("\n");
    html +=
      `<p style="${FONT}"><strong>Bilagor (${attachments.length})</strong></p><ul style="${FONT}">` +
      attachments
        .map((a) => {
          const size = formatSize(a.size);
          return `<li><a href="${escapeHtml(a.url)}">${escapeHtml(a.name)}</a>${size ? ` <span style="color:#5B636B">(${escapeHtml(size)})</span>` : ""}</li>`;
        })
        .join("") +
      `</ul>`;
  }

  if (includeSource && q.source) {
    text += `\n\nLeadkälla: ${q.source}`;
    html += `<p style="${FONT};color:#5B636B;font-size:12px">Leadkälla: ${escapeHtml(q.source)}</p>`;
  }

  return { text, html };
}

/** Mail to the company. Reply-to is the customer so "Svara" goes straight to them. */
export function sendCompanyNotification(siteName: string, to: string, q: QuoteInput): Promise<MailResult> {
  const t = table(q, { includeAttachments: true, includeSource: true });
  return sendMail({
    to,
    replyTo: q.email,
    subject: `Ny offertförfrågan: ${q.jobType} – ${q.name}`,
    text: `Ny offertförfrågan via ${siteName}.\n\n${t.text}\n\nSvara direkt på detta mejl för att nå kunden.`,
    html: `<p style="font-family:Arial,sans-serif">Ny offertförfrågan via ${escapeHtml(siteName)}.</p>${t.html}<p style="font-family:Arial,sans-serif;color:#5B636B;font-size:12px">Svara direkt på detta mejl för att nå kunden.</p>`,
  });
}

/** Receipt to the customer with a summary of what they sent. */
export function sendCustomerReceipt(siteName: string, q: QuoteInput, replyTo: string | null): Promise<MailResult> {
  const t = table(q);
  return sendMail({
    to: q.email,
    ...(replyTo ? { replyTo } : {}),
    subject: `Vi har tagit emot din förfrågan – ${siteName}`,
    text: `Hej ${q.name}!\n\nTack för din förfrågan. Vi har tagit emot den och återkommer så snart vi kan.\n\nSammanfattning:\n${t.text}\n\nVänliga hälsningar\n${siteName}`,
    html: `<p style="font-family:Arial,sans-serif">Hej ${escapeHtml(q.name)}!</p><p style="font-family:Arial,sans-serif">Tack för din förfrågan. Vi har tagit emot den och återkommer så snart vi kan.</p><p style="font-family:Arial,sans-serif"><strong>Sammanfattning</strong></p>${t.html}<p style="font-family:Arial,sans-serif">Vänliga hälsningar<br>${escapeHtml(siteName)}</p>`,
  });
}
