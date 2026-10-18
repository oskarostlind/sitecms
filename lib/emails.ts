import { escapeHtml } from "@/lib/mail";
import type { MembershipRole } from "@/lib/db/schema";

/**
 * Innehåll i transaktionsmejlen (bekräfta adress, återställ lösenord,
 * inbjudan, "du har redan ett konto"). Rena funktioner som returnerar
 * { subject, text, html } — själva utskicket görs med sendMail() i
 * lib/mail.ts, avsändaren kommer från env MAIL_FROM.
 *
 * HTML:en är medvetet enkel: inga tabeller, bara inline-styles, max 600px,
 * en knapp + länken utskriven i klartext som reserv för klienter som
 * blockerar knappar.
 */

export type EmailContent = {
  subject: string;
  text: string;
  html: string;
};

export const MEMBERSHIP_ROLE_LABELS: Record<MembershipRole, string> = {
  owner: "Ägare",
  editor: "Redaktör",
};

const ROLE_DESCRIPTIONS: Record<MembershipRole, string> = {
  owner: "ägare — du kan redigera innehåll och hantera inställningar, integration och medlemmar",
  editor: "redaktör — du kan redigera texter, bilder, inlägg och tjänster",
};

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

type LayoutInput = {
  /** Dold förhandsvisningstext i inkorgen. */
  preheader: string;
  heading: string;
  /** Stycken (ren text — escapas här). */
  paragraphs: string[];
  button: { label: string; url: string };
  /** Liten text under knappen, t.ex. giltighetstid. */
  note?: string;
  /** Avslutande rad i grått, t.ex. "Om du inte bett om det här…". */
  footer: string;
};

function layout({ preheader, heading, paragraphs, button, note, footer }: LayoutInput): string {
  const url = escapeHtml(button.url);
  const body = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">${escapeHtml(p)}</p>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f6f8;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<div style="max-width:600px;margin:0 auto;padding:40px 20px;font-family:${FONT};">
  <div style="margin:0 0 24px;font-size:18px;font-weight:700;letter-spacing:-0.01em;color:#121f47;">
    <span style="display:inline-block;width:28px;height:28px;line-height:28px;margin-right:8px;border-radius:7px;background:#2450d1;color:#ffffff;text-align:center;font-size:18px;vertical-align:middle;">s</span><span style="vertical-align:middle;">sitecms</span>
  </div>
  <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:32px 28px;">
    <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;font-weight:600;color:#111827;">${escapeHtml(heading)}</h1>
    ${body}
    <div style="margin:28px 0 8px;">
      <a href="${url}" style="display:inline-block;background:#2450d1;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:12px 22px;border-radius:8px;">${escapeHtml(button.label)}</a>
    </div>
    ${note ? `<p style="margin:12px 0 0;font-size:14px;line-height:1.5;color:#6b7280;">${escapeHtml(note)}</p>` : ""}
    <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#6b7280;">Fungerar inte knappen? Kopiera länken till din webbläsare:<br><a href="${url}" style="color:#2450d1;word-break:break-all;">${url}</a></p>
  </div>
  <p style="margin:20px 4px 0;font-size:13px;line-height:1.5;color:#9ca3af;">${escapeHtml(footer)}</p>
</div>
</body>
</html>`;
}

function greeting(name: string | null | undefined): string {
  const trimmed = name?.trim();
  return trimmed ? `Hej ${trimmed}!` : "Hej!";
}

/** Bekräfta e-postadressen efter registrering. */
export function verifyEmail({ name, url }: { name?: string | null; url: string }): EmailContent {
  const subject = "Bekräfta din e-postadress för sitecms";
  const intro = "Tack för att du skapade ett konto på sitecms. Klicka på knappen för att bekräfta din e-postadress, sedan kan du logga in.";
  const note = "Länken gäller i 7 dagar och kan bara användas en gång.";
  const footer = "Har du inte skapat något konto kan du ignorera det här mejlet — inget händer.";

  return {
    subject,
    text: [greeting(name), "", intro, "", url, "", note, "", footer].join("\n"),
    html: layout({
      preheader: "Ett klick kvar — bekräfta din e-postadress.",
      heading: "Bekräfta din e-postadress",
      paragraphs: [greeting(name), intro],
      button: { label: "Bekräfta e-postadressen", url },
      note,
      footer,
    }),
  };
}

/** Länk för att välja nytt lösenord (glömt lösenord, eller skickad av admin). */
export function resetEmail({ name, url }: { name?: string | null; url: string }): EmailContent {
  const subject = "Välj ett nytt lösenord för sitecms";
  const intro = "Vi har fått en begäran om att välja ett nytt lösenord för ditt konto på sitecms. Klicka på knappen för att välja ett nytt.";
  const note = "Länken gäller i 2 timmar och kan bara användas en gång.";
  const footer = "Har du inte bett om ett nytt lösenord kan du ignorera det här mejlet — ditt nuvarande lösenord fortsätter att fungera.";

  return {
    subject,
    text: [greeting(name), "", intro, "", url, "", note, "", footer].join("\n"),
    html: layout({
      preheader: "Välj ett nytt lösenord för ditt konto.",
      heading: "Välj ett nytt lösenord",
      paragraphs: [greeting(name), intro],
      button: { label: "Välj nytt lösenord", url },
      note,
      footer,
    }),
  };
}

/** Inbjudan att bli medlem (ägare/redaktör) på en sajt. */
export function inviteEmail({
  siteName,
  inviterName,
  role,
  url,
  expiresDays = 7,
}: {
  siteName: string;
  inviterName: string;
  role: MembershipRole;
  url: string;
  expiresDays?: number;
}): EmailContent {
  const subject = `${inviterName} har bjudit in dig till ${siteName} i sitecms`;
  const intro = `${inviterName} har bjudit in dig att hantera hemsidan ${siteName} i sitecms.`;
  const roleLine = `Du blir ${ROLE_DESCRIPTIONS[role]}.`;
  const how = "Klicka på knappen för att acceptera. Har du inget konto ännu väljer du namn och lösenord i nästa steg.";
  const note = `Inbjudan gäller i ${expiresDays} dagar.`;
  const footer = "Väntade du dig inte den här inbjudan kan du ignorera mejlet — inget konto aktiveras förrän du accepterar.";

  return {
    subject,
    text: ["Hej!", "", intro, roleLine, "", how, "", url, "", note, "", footer].join("\n"),
    html: layout({
      preheader: `Du är inbjuden som ${MEMBERSHIP_ROLE_LABELS[role].toLowerCase()} till ${siteName}.`,
      heading: `Du är inbjuden till ${siteName}`,
      paragraphs: ["Hej!", intro, roleLine, how],
      button: { label: "Acceptera inbjudan", url },
      note,
      footer,
    }),
  };
}

/**
 * Skickas när någon försöker registrera en adress som redan har ett konto.
 * Sidan visar samma meddelande som vid en lyckad registrering, så att ingen
 * kan ta reda på vilka adresser som finns — ägaren av adressen får i stället
 * veta det här, med länkar för att logga in eller välja nytt lösenord.
 */
export function accountExistsEmail({
  name,
  loginUrl,
  forgotUrl,
}: {
  name?: string | null;
  loginUrl: string;
  forgotUrl: string;
}): EmailContent {
  const subject = "Du har redan ett konto på sitecms";
  const intro = "Någon (förhoppningsvis du) försökte just skapa ett konto på sitecms med den här e-postadressen. Du har redan ett konto, så inget nytt skapades.";
  const how = `Logga in som vanligt. Har du glömt lösenordet, eller har du aldrig valt något, kan du välja ett nytt här: ${forgotUrl}`;
  const footer = "Var det inte du kan du ignorera det här mejlet — ditt konto är oförändrat.";

  return {
    subject,
    text: [greeting(name), "", intro, "", `Logga in: ${loginUrl}`, "", how, "", footer].join("\n"),
    html: layout({
      preheader: "Du har redan ett konto — logga in eller välj ett nytt lösenord.",
      heading: "Du har redan ett konto",
      paragraphs: [greeting(name), intro, "Logga in som vanligt. Har du glömt lösenordet, eller har du aldrig valt något, kan du välja ett nytt via \"Glömt lösenord?\" på inloggningssidan."],
      button: { label: "Logga in", url: loginUrl },
      footer,
    }),
  };
}
