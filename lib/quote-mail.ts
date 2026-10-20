import { escapeHtml, sendMail, type MailResult } from "@/lib/mail";
import type { QuoteInput } from "@/lib/quote-validation";

type Row = [label: string, value: string | null];

function rows(q: QuoteInput): Row[] {
  return [
    ["Namn", q.name],
    ["Företag", q.company],
    ["Telefon", q.phone],
    ["E-post", q.email],
    ["Typ av uppdrag", q.jobType],
    ["Maskin", q.machine],
    ["Plats/ort", q.location],
    ["Önskad start", q.desiredStart],
  ];
}

function table(q: QuoteInput): { text: string; html: string } {
  const filled = rows(q).filter(([, v]) => v);
  const text =
    filled.map(([k, v]) => `${k}: ${v}`).join("\n") + `\n\nBeskrivning:\n${q.description}`;
  const html =
    `<table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">` +
    filled
      .map(
        ([k, v]) =>
          `<tr><td style="color:#5B636B;vertical-align:top">${escapeHtml(k)}</td><td><strong>${escapeHtml(v!)}</strong></td></tr>`,
      )
      .join("") +
    `</table><p style="font-family:Arial,sans-serif;font-size:14px"><strong>Beskrivning</strong><br>${escapeHtml(q.description).replace(/\n/g, "<br>")}</p>`;
  return { text, html };
}

/** Mail to the company. Reply-to is the customer so "Svara" goes straight to them. */
export function sendCompanyNotification(siteName: string, to: string, q: QuoteInput): Promise<MailResult> {
  const t = table(q);
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
