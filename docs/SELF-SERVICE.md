# Självbetjäning — arkitekturkontrakt

Mål: en webbutvecklare ska kunna koppla en kundsajt till sitecms helt själv —
skapa konto, skapa sajt, deklarera vilka fält sajten har, hämta innehåll,
bjuda in kunden som redaktör — utan att någon på sitecms gör något.

Det här dokumentet är kontraktet mellan fundamentet (byggt) och de delar som
byggs parallellt. Läs det innan du rör kod.

## Roller

| Nivå | Värde | Betyder |
|---|---|---|
| `users.role` | `admin` | Oskar. Ser och får göra allt på alla sajter. |
| `users.role` | `customer` | Alla andra (utvecklare och deras kunder). Åtkomst via `memberships`. |
| `memberships.role` | `owner` | Får hantera inställningar, integration, medlemmar och struktur (sidor/fält). Den som skapar en sajt blir owner. |
| `memberships.role` | `editor` | Får redigera innehåll (block, inlägg, tjänster, SEO, media). |

Guards i `lib/guard.ts`:

- `requireUser()` — inloggad.
- `requireSiteAccess(siteId)` — inloggad + medlem (owner eller editor) eller admin. Returnerar `AuthUser` (oförändrad signatur).
- `requireSiteAccessWithRole(siteId)` — samma, men returnerar `{ user, siteRole, isOwner }`.
- `requireSiteOwner(siteId)` — admin eller owner. Redirectar editors till `/admin/sites/[siteId]?error=owner-only`.
- `getOwnedSiteIds(user)` — används av layouten för menyn.
- `requireAdmin()` (`lib/admin-guard.ts`) — bara för globala adminvyer (`/admin/anvandare`, `/admin/aktivitet`).

## Datamodell (lib/db/schema.ts) — ändra inte utan att prata med arkitekten

Nytt i fundamentet:

- `users.passwordHash` är nu nullable (inbjudna och Google-konton utan lösenord). `users.emailVerifiedAt` (timestamp|null).
- `memberships.role` `'owner' | 'editor'` (default editor).
- `sites.createdByUserId`, `sites.lastSchemaSyncAt`, `sites.lastConnectionStatus` (`'ok'|'failed'|null`), `sites.lastConnectionCheckedAt`.
- `pages.description` (text|null).
- `blocks.label`, `blocks.help` (text|null) — editorn visar dessa före fallback i `components/admin/labels.ts`.
- `auth_tokens`: engångslänkar (`verify`, `reset`, `invite`). Rå token finns bara i mejlet; DB lagrar sha256. Hjälpare i `lib/tokens.ts`: `createToken`, `peekToken`, `consumeToken`.

Migrationer: `drizzle-manual/NNNN_*.sql`, idempotenta, körs automatiskt av `scripts/migrate.ts` i `npm run build` (Vercel). Behöver du en kolumn: lägg till i schema.ts OCH en ny fil `drizzle-manual/0003_*.sql`, och skriv det i din slutrapport.

## E-post

`lib/mail.ts` → `sendMail({ to, subject, text, html })` via Resend REST. Env: `RESEND_API_KEY`, `MAIL_FROM` (`sitecms <info@oskarostlind.se>`). Returnerar `{ ok, ... }` och kastar aldrig. `escapeHtml` finns. Bas-URL för länkar: `appUrl()` i `lib/app-url.ts`.

## Meny (components/admin/AdminShell.tsx — redan ändrad)

Sajtmeny: Översikt, Sidor, Inlägg, Tjänster & priser, SEO, Media, Aktivitet, **Medlemmar** (`medlemmar`, owner), **Integration** (`integration`, owner), Inställningar (owner). Allmänt för alla: Alla sajter, Ny sajt. Admin: Användare, All aktivitet.

## Aktivitetslogg

`logActivity({ userId, userEmail, siteId, action, detail })` i `lib/audit.ts`. Nycklar som redan har svensk etikett i `lib/audit-labels.ts`: `account.signup`, `account.verify`, `account.password_reset`, `members.invite`, `members.invite_resend`, `members.invite_revoke`, `members.accept`, `members.role_change`, `members.remove`, `pages.create`, `pages.update`, `pages.delete`, `blocks.create`, `blocks.delete`, `schema.sync`, `sites.connection_check`, `sites.delete`. Skriv alltid en `detail` på svenska.

## Konventioner

- Svensk UI-text, samma designsystem som resten (`components/ui`: `PageHeader`, `Card`, `Field`, `Input`, `SubmitButton`, `Alert`, `Table`, `Badge`, `EmptyState`, `ConfirmButton` i `components/content`). Titta på en befintlig sida (t.ex. `app/admin/sites/[siteId]/installningar/page.tsx`) och gör likadant.
- Server actions i `lib/actions/*.ts` med `"use server"`, fel via `redirect("...?error=kod")`, success via `?success=1`. Mönstret "visa hemlighet en gång via query" finns i `lib/actions/sites.ts`.
- Publika API-routes under `app/api/v1/sites/[slug]/…` autentiseras med `authenticateSite(slug, request)` (`x-api-key`). Svara alltid med `CONTENT_CACHE_HEADERS`.
- Inga nya npm-beroenden utan att skriva det i slutrapporten (helst inga alls).
- Kör `npm run typecheck` innan du är klar. `npm run build:local` bygger utan databas.
- Rör inte: `lib/db/schema.ts`, `scripts/migrate.ts`, `lib/guard.ts`, `components/admin/AdminShell.tsx`, `lib/audit-labels.ts` (be arkitekten).

## Delområden

### A — Konto, inbjudningar, e-postflöden (`app/(auth)/…`, `lib/actions/account.ts`, `lib/actions/members.ts`, `app/admin/sites/[siteId]/medlemmar/`)

- `/signup`: namn, e-post, lösenord (min 10 tecken) → skapar `users` (role customer, emailVerifiedAt null) → skickar verifieringsmejl (`verify`-token, länk `/verify?token=…`) → visar "kolla din mejl". Dubblettadress: generiskt meddelande + skicka om-länk, läck inte om kontot finns.
- `/verify?token=`: consumeToken → sätt emailVerifiedAt → logga `account.verify` → logga in användaren automatiskt om möjligt, annars redirect `/login?verified=1`.
- Login (`/login`, `lib/auth-actions.ts`): om kontot finns men är overifierat → `?error=unverified` med knapp "Skicka ny bekräftelse". Länkar till `/signup` och `/forgot`.
- `/forgot` → `reset`-token → mejl → `/reset?token=` sätter nytt lösenord (`account.password_reset`).
- Google-login (`lib/auth.ts` signIn-callback): skapa konto automatiskt om adressen saknas (name från profilen, emailVerifiedAt = now, passwordHash null). Befintliga konton: markera emailVerifiedAt om null.
- Medlemmar per sajt (`/admin/sites/[siteId]/medlemmar`, owner): lista medlemmar (namn, e-post, roll), väntande inbjudningar (e-post, roll, skickad, går ut), bjud in (e-post + roll) → skapa user om saknas (name = e-postens lokaldel, passwordHash null) + membership? **Nej** — membership skapas först vid accept. Inbjudan = `invite`-token med siteId + membershipRole. Mejl med länk `/invite?token=`. Skicka om, återkalla (usedAt = now), ändra roll, ta bort medlem. Minst en owner måste finnas kvar; man får inte ta bort sig själv som sista owner.
- `/invite?token=`: visa sajtens namn + inbjudarens namn. Om användaren saknar lösenord: formulär namn + lösenord. Om användaren redan finns med lösenord: knapp "Acceptera" (kräver inloggning som rätt e-post; annars login med callbackUrl). Vid accept: membership upsert (roll från token), emailVerifiedAt = now, logga `members.accept`, redirect till sajten.
- Admin-vyn `/admin/anvandare` behåller sin funktion (admin), men "skapa användare med temporärt lösenord" ska i stället skicka en inbjudan via e-post till valda sajter som owner/editor (en inbjudan per sajt). Ta bort visning av temporära lösenord.
- `/admin/konto`: visa om e-posten är bekräftad; Google-konton utan lösenord ser "Välj ett lösenord".
- Mejl: enkel, luftig HTML + text-variant. Avsändare från env. Ämnen på svenska.

### B — Schema-sync och strukturhantering (`app/api/v1/sites/[slug]/schema/route.ts`, `lib/schema-sync.ts`, `lib/actions/pages.ts`, `app/admin/sites/[siteId]/pages/…`, `components/admin/PageBlockEditor.tsx`)

Kundsajten deklarerar sina fält och CMS:et skapar strukturen. Format (JSON, body till `POST /api/v1/sites/[slug]/schema`, `x-api-key`):

```json
{
  "version": 1,
  "pages": [
    {
      "slug": "home",
      "title": "Startsida",
      "description": "Det besökaren ser först.",
      "blocks": [
        { "key": "hero.title", "type": "text", "label": "Rubrik", "help": "Max 60 tecken", "default": "Välkommen" },
        { "key": "hero.image", "type": "image", "label": "Hero-bild", "default": "https://…/hero.jpg", "defaultAlt": "Byggarbetare" },
        { "key": "intro.body", "type": "richtext", "label": "Ingress" }
      ]
    }
  ],
  "prune": false
}
```

Regler:

- Sidor och block som saknas skapas (block får `value = default`, `alt = defaultAlt`). Befintliga block: uppdatera `type`, `label`, `help`, `sortOrder` (ordningen i deklarationen) — **skriv aldrig över `value`/`alt`** (kundens innehåll vinner). Tomt `value` på befintligt block får dock fyllas med `default` (kunden har inte skrivit något).
- Sidors `title`/`description`/`sortOrder` uppdateras från deklarationen.
- `prune: true` tar bort block (och tomma sidor) som inte finns i deklarationen; default `false` → rapporteras som `orphans`.
- Validering: `slug`/`key` matchar `^[a-z0-9][a-z0-9._-]*$`, `type` ∈ text|richtext|image, max 100 sidor × 200 block. Fel → 400 med `{ error, issues: [...] }`.
- Svar 200: `{ ok: true, created: { pages, blocks }, updated: { pages, blocks }, orphans: [{ pageSlug, key }], pruned: {...} }`. Sätt `sites.lastSchemaSyncAt`. Logga `schema.sync` (userId = `00000000-0000-0000-0000-000000000000`, userEmail = `api@sitecms` — audit_logs.userId är NOT NULL utan FK).
- `GET …/schema` returnerar nuvarande struktur i samma format (utan `default`, men med `hasValue: boolean` per block) så utvecklaren kan diffa.
- Content-API (`…/content`): lägg till `label` och `description` i svaret (additivt).
- Panel-UI (owner): på `/admin/sites/[siteId]/pages` kan man skapa sida (titel → slug), byta namn, ta bort sida (bekräfta; tar bort block). I sideditorn: "Lägg till fält" (key, typ, etikett), ta bort fält. Editors ser inte dessa knappar. `PageBlockEditor` ska visa `block.label`/`block.help` när de finns (fallback `labels.ts`). Logga `pages.*`/`blocks.*`.
- Lägg till exempel på schemat i `docs/SELF-SERVICE.md`-stil i din rapport så C kan dokumentera (C skriver docs; du skickar exakt format i slutrapporten).

### C — Integration, SDK, utvecklardokumentation, landningssida (`app/admin/sites/[siteId]/integration/`, `app/api/v1/sites/[slug]/health/route.ts`, `app/docs/`, `app/page.tsx`, `packages/sitecms-next/`)

- `/admin/sites/[siteId]/integration` (owner): steg-för-steg:
  1. **Nycklar**: sajtens `slug`, `CMS_API_URL` (= `appUrl()`), API-nycklar (lista + skapa/ta bort — återanvänd actions i `lib/actions/sites.ts`), revalidate-URL + hemlighet (formulär från installningar kan flyttas hit eller länkas). Env-block att kopiera: `CMS_API_URL=…`, `CMS_SITE=slug`, `CMS_API_KEY=…` (visas bara när ny nyckel just skapats), `CMS_REVALIDATE_SECRET=…`.
  2. **Kod att klistra in** (Next.js App Router, TypeScript, utan beroenden): `lib/sitecms.ts` (typad klient: `getContent()`, `getPosts()`, `getPost(slug)`, `block(content, pageSlug, key)`, allt med `fetch(..., { next: { tags: ["sitecms"] } })`), `app/api/sitecms/revalidate/route.ts` (POST, jämför `secret`, `revalidateTag("sitecms")`), `sitecms.config.ts` + `scripts/sitecms-sync.ts` (läser config, `POST …/schema`; körs i `"prebuild"`).
  3. **Testa anslutningen**: knapp → server action `checkConnection(siteId)`: POST till `revalidateUrl` med hemligheten, förvänta 2xx; uppdatera `sites.lastConnectionStatus/CheckedAt`; logga `sites.connection_check`; visa resultat. Visa även "Senaste schema-sync: …" från `lastSchemaSyncAt`.
  4. **Bjud in kunden** → länk till medlemmar.
- `GET /api/v1/sites/[slug]/health` (`x-api-key`): `{ ok: true, site: { name, slug }, pages: n, lastSchemaSyncAt }` — så utvecklaren kan verifiera nyckeln med curl.
- `packages/sitecms-next/`: samma klient som npm-paket (`sitecms-next`, `package.json`, `src/index.ts`, `README.md`), inte publicerat ännu — panelen pekar i första hand på copy-paste.
- `/docs` (publik, utan inloggning): "Kom igång på 10 minuter" (konto → sajt → nycklar → kod → schema-sync → bjud in kund), API-referens (content, posts, posts/[slug], schema GET/POST, health, revalidate-webhook, felkoder), schema-format (ta exakt format från detta dokument, avsnitt B). Statisk, snyggt typsatt, samma designspråk som landningssidan.
- Landningssidan `app/page.tsx`: primär CTA "Skapa konto" → `/signup`, sekundär "Logga in". Ny sektion "För utvecklare": tre steg + länk till `/docs`. Behåll befintlig stil.

## Efter merge (arkitekten)

Env i Vercel: `RESEND_API_KEY`, `MAIL_FROM`, `APP_URL`. Deploy → migration körs i build → E2E i prod.
