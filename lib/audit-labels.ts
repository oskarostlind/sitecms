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
  "sites.update": "Uppdaterade sajtens inställningar",
  "sites.secret_regenerate": "Skapade en ny hemlig nyckel",
  "users.create": "Skapade en användare",
  "users.delete": "Tog bort en användare",
  "users.password_reset": "Återställde ett lösenord",
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
