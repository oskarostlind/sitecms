/**
 * Läsbara (svenska) beskrivningar av rader i aktivitetsloggen (`audit_logs`).
 *
 * `detail` skrivs av server actions via `logActivity()` och är redan en
 * mänsklig mening ("Uppdaterade Hero-sektion på Startsidan"). Saknas den
 * faller vi tillbaka på en etikett för `action`-nyckeln, och i sista hand på
 * själva nyckeln – så en rad blir aldrig tom.
 *
 * Ren funktion utan beroenden: kan användas i både server- och klientkod.
 */

const ACTION_LABELS: Record<string, string> = {
  "account.password_change": "Bytte lösenord",
  "activity.undo": "Ångrade en ändring",
  "apikeys.create": "Skapade en API-nyckel",
  "apikeys.delete": "Tog bort en API-nyckel",
  "blocks.update": "Uppdaterade innehåll på en sida",
  "media.upload": "Laddade upp en fil",
  "media.delete": "Tog bort en fil",
  "posts.create": "Skapade ett inlägg",
  "posts.update": "Uppdaterade ett inlägg",
  "posts.publish": "Publicerade ett inlägg",
  "posts.delete": "Tog bort ett inlägg",
  "seo.create": "Lade till SEO-inställningar",
  "seo.update": "Uppdaterade SEO-inställningar",
  "seo.delete": "Tog bort SEO-inställningar",
  "services.create": "Lade till en tjänst",
  "services.update": "Uppdaterade en tjänst",
  "services.delete": "Tog bort en tjänst",
  "sites.create": "Skapade sajten",
  "quotes.status": "Ändrade status på en offertförfrågan",
  "quotes.delete": "Tog bort en offertförfrågan",
  "sites.update": "Uppdaterade sajtens inställningar",
  "sites.secret_regenerate": "Skapade en ny hemlig nyckel",
  "users.create": "Skapade en användare",
  "users.delete": "Tog bort en användare",
  "users.password_reset": "Återställde ett lösenord",
  "account.signup": "Skapade sitt konto",
  "account.verify": "Bekräftade sin e-postadress",
  "account.password_reset": "Återställde sitt lösenord via e-post",
  "members.invite": "Bjöd in en medlem",
  "members.invite_resend": "Skickade om en inbjudan",
  "members.invite_revoke": "Återkallade en inbjudan",
  "members.accept": "Accepterade en inbjudan",
  "members.role_change": "Ändrade en medlems roll",
  "members.remove": "Tog bort en medlem",
  "pages.create": "Skapade en sida",
  "pages.update": "Uppdaterade en sida",
  "pages.delete": "Tog bort en sida",
  "blocks.create": "Lade till ett fält",
  "blocks.delete": "Tog bort ett fält",
  "schema.sync": "Synkade sajtens struktur från kundsajten",
  "sites.connection_check": "Testade anslutningen till kundsajten",
  "sites.delete": "Tog bort sajten",
  "account.delete": "Avslutade sitt konto",
};

/** Etikett för en action-nyckel, t.ex. "posts.create" → "Skapade ett inlägg". */
export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

/** Text som visas för en rad i aktivitetsloggen: `detail` om den finns, annars etikett för `action`. */
export function describeActivity(row: { action: string; detail?: string | null }): string {
  const detail = row.detail?.trim();
  return detail ? detail : actionLabel(row.action);
}
