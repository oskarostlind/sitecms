# sitecms – designsystem & UI-riktlinjer

> Läs den här filen innan du rör någon UI-kod. Den beskriver tokens, komponenter och
> mönster som hela panelen, inloggningen och startsidan följer. Ändra i systemet
> (`app/globals.css`, `components/ui/`) – inte i enskilda vyer – när något saknas.

## 1. Princip

Panelen används av icke-tekniska småföretagare (t.ex. en byggfirma) som ska kunna
ändra text/bilder på sin hemsida utan att kunna ha sönder något. Därför:

1. **Lugn och stram.** Ljust tema, vit yta på ljusgrå bakgrund, mycket luft, tunna
   ramar. Aldrig "busy".
2. **En accentfärg, en primär handling per vy.** Blå (`brand`) används bara för
   primärknappar, aktiv navigation, fokusringar och länkar. Allt annat är neutralt.
3. **Alltid feedback.** Varje sparning ger en toast, varje formulär visar
   "Sparar…", varje fel syns nära fältet. Ingen tyst omladdning.
4. **Trygghet.** Osparade ändringar är tydliga, "Ångra" finns, destruktiva
   handlingar är röda och bekräftas.
5. **Svenska överallt.** Mjuk ton, du-tilltal, korta hjälptexter under fält.

## 2. Tokens (Tailwind v4, `@theme` i `app/globals.css`)

### Färg

| Token | Värde | Användning |
|---|---|---|
| `brand-50` | `#eef4ff` | Ljus bakgrund bakom aktiva element, info-alerts |
| `brand-100` | `#dce7fd` | Hover på ljusa brand-ytor |
| `brand-200` | `#c0d3fb` | Ramar på brand-ytor |
| `brand-300` | `#93b4f7` | – |
| `brand-400` | `#5f8cf0` | – |
| `brand-500` | `#3a68e6` | Fokusring (`ring-brand-500/40`), ikoner |
| `brand-600` | `#2450d1` | **Primärknapp, aktiv nav, länkar** |
| `brand-700` | `#1d40ac` | Hover på primärknapp |
| `brand-800` | `#1b378b` | Active/pressed |
| `brand-900` | `#1b3170` | Text på brand-50 |
| `brand-950` | `#121f47` | Mörk logga/OG-bild |

Neutrala: Tailwinds `neutral`-skala. Bakgrund `neutral-50`, kort `white`, ramar
`neutral-200`, sekundär text `neutral-500`, primär text `neutral-900`.

Status: `emerald` (lyckat/publicerad), `amber` (varning/osparat/utkast med
åtgärd), `red` (fel/destruktivt). Använd `-50` bakgrund + `-200` ram + `-700/800`
text för alerts/badges.

### Typografi

- Font: **Inter Variable** (`@fontsource-variable/inter`, importeras i
  `app/layout.tsx`). `--font-sans: "Inter Variable", ui-sans-serif, system-ui, …`.
- Sidtitel (h1): `text-2xl font-semibold tracking-tight` (panel) /
  `text-4xl–6xl` (startsida).
- Sektionstitel (h2 i kort): `text-base font-semibold`.
- Brödtext: `text-sm` (14px) i panelen, `text-base` på startsidan.
- Hjälptext: `text-xs text-neutral-500`.
- Etiketter: `text-sm font-medium text-neutral-800`.
- Eyebrow/gruppnamn i sidebar: `text-[11px] font-semibold uppercase tracking-wider text-neutral-500`.

### Form & yta

- Radie: kort `rounded-xl` (12px), fält/knappar `rounded-lg` (8px), badges `rounded-full`, små ikon-knappar `rounded-md`.
- Kort: `bg-white border border-neutral-200 shadow-sm` – aldrig tyngre skugga än `shadow-sm` i vila; `hover:shadow-md` bara på klickbara kort.
- Fält: höjd 40px (`h-10`), `border-neutral-300 bg-white`, hover `border-neutral-400`,
  fokus `border-brand-500 ring-2 ring-brand-500/30`, fel `border-red-400 ring-red-500/25`.
- Fokus överallt: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2`.
- Avstånd: sektioner `space-y-6`, inuti kort `p-5 sm:p-6`, fältgrupper `space-y-4`.
- Maxbredd innehåll: `max-w-5xl` (listor/dashboards), `max-w-3xl` (formulär/editorer).
- Övergångar: `transition-colors duration-150`. Respektera `prefers-reduced-motion`.

### Ikoner

`lucide-react`, storlek 16px (`className="size-4"`) i knappar/nav, 20px i
tomtillstånd/statkort. Alltid `aria-hidden` när ikonen står bredvid text.

## 3. Komponenter (`components/ui/`)

Alla komponenter är små, typade, tar `className` och skickar vidare övriga props.
Exportera allt via `components/ui/index.ts`.

| Komponent | Beskrivning |
|---|---|
| `Button` | `variant: primary \| secondary \| ghost \| danger \| link`, `size: sm \| md \| lg`, `loading` (spinner + disabled), `icon`. Renderar `<button>`. `ButtonLink` = samma utseende som `next/link`. |
| `SubmitButton` | Klient-knapp för server-action-formulär: använder `useFormStatus()` och visar `loading` automatiskt. Text vid laddning via `pendingText`. |
| `Input`, `Textarea`, `Select`, `Checkbox`, `Switch` | Stylade grundfält. `invalid`-prop sätter felutseende + `aria-invalid`. |
| `Field` | Wrapper: `label`, `hint`, `error`, `required`, `count` (t.ex. "46/60"). Kopplar `htmlFor`/`aria-describedby` automatiskt. |
| `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | Standardkort. `CardHeader` kan ta `actions`. |
| `PageHeader` | `title`, `description`, `breadcrumbs?: {label, href?}[]`, `actions?`. Alltid överst i varje vy. |
| `Badge` | `tone: neutral \| brand \| success \| warning \| danger`, valfri `dot`. |
| `Alert` | `tone: info \| success \| warning \| danger`, `title?`, ikon, `role="alert"` för fel. |
| `EmptyState` | `icon`, `title`, `description`, `action?`. Streckad ram, centrerad. |
| `Toast` / `ToastProvider` / `useToast()` | Nedre högra hörnet, `aria-live="polite"`. `toast({ title, description?, tone?, action?: {label, onClick} })`. Auto-stäng 5 s (fel: 8 s). |
| `Skeleton` | Pulserande platshållare. |
| `Table`, `Thead`, `Tbody`, `Tr`, `Th`, `Td` | Tabell med `overflow-x-auto`-wrapper, sticky header-stil. |
| `Tabs`, `TabList`, `Tab`, `TabPanel` | Enkel klient-tabs med `role="tablist"`, piltangenter. |
| `Avatar` | Initialer på brand-50/brand-700, `size`. |
| `Kbd` | Liten tangent-badge (t.ex. `Ctrl+S`). |
| `Spinner` | 16px SVG-snurra. |
| `Logo` | Blå rundad ruta med "s" + ordmärket "sitecms". `size`, `withWordmark`. |

Hjälpfunktioner i `lib/format.ts`: `formatDateTime(date)`, `formatDate(date)`,
`relativeTime(date)` ("för 2 timmar sedan", "i går 14:32"), `initials(name)`.

`lib/cn.ts`: `cn(...classes)` (enkel join som filtrerar falsy; ingen extra dependency).

## 4. Layout i panelen (`AdminShell`)

```
┌──────────────┬──────────────────────────────────────────────┐
│ Logo         │ Topbar: breadcrumb/sajtnamn  · Visa sajten ↗ │
│ [Sajtväljare]│ ─────────────────────────────────────────────│
│ Översikt     │                                              │
│ Sidor        │  <PageHeader>                                │
│ Inlägg       │  innehåll (max-w-5xl, p-6 md:p-8)            │
│ …            │                                              │
│ ADMIN        │                                              │
│ Användare    │                                              │
│ …            │                                              │
│ ────────     │                                              │
│ [Avatar] Namn│                                              │
│  ▾ meny      │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

- Sidebar **ljus**: `bg-white border-r border-neutral-200`, bredd 260px, sticky.
- Nav-länk: ikon + text, `rounded-lg px-3 py-2 text-sm`. Aktiv:
  `bg-brand-50 text-brand-700 font-medium` + ikon i `text-brand-600`. Hover:
  `bg-neutral-100`. Använd `next/link` (ingen full omladdning).
- Sajtväljare: knapp med sajtens initialer + namn + chevron; popover-lista med alla
  sajter (admin) + "Alla sajter". Kund med en sajt: bara namn utan chevron.
- "Visa sajten ↗": extern länk till `https://{domain}` om domän finns.
- Användarmeny nederst: avatar + namn + e-post, klick → meny med "Mitt konto",
  "Logga ut".
- Mobil (<md): topbar med logo + hamburgare; sidebar som **overlay-drawer** från
  vänster (bakgrund `bg-neutral-900/40`), stängs på Escape/klick utanför/navigering.
- `ToastProvider` ligger i shellen så alla vyer kan använda `useToast()`.
- Sparrad (page editor): `sticky bottom-0` **inuti `<main>`** – aldrig `fixed`
  över sidebaren (buggen idag: raden täcker "Logga ut").

## 5. Mönster

- **Sidhuvud:** varje vy börjar med `PageHeader`. Underrubrik i en mening om vad vyn
  gör. Primär åtgärd som knapp till höger.
- **Formulär med server actions:** använd `SubmitButton` (pending-state). Vid
  lyckat resultat: toast. Sidor som idag bara `revalidatePath`:ar kan visa toast via
  `?saved=1`-param läst i en liten klientkomponent (`FlashToast`), eller via
  `useActionState`. Rör inte server actions' signaturer.
- **Osparade ändringar:** klient-editorer (PageBlockEditor, PostForm) registrerar
  `beforeunload` när `dirty`.
- **Tomtillstånd:** alltid `EmptyState` med ikon, en mening och primär åtgärd.
- **Destruktivt:** `Button variant="danger"` (outline-röd i listor, fylld röd i
  bekräftelse). `ConfirmButton` behålls men får ui-stil.
- **Badges:** Publicerad = success, Utkast = neutral, Admin = brand, Kund = neutral,
  Dold = warning.
- **Tabeller:** rubrikrad `text-xs uppercase tracking-wide text-neutral-500`, rader
  `hover:bg-neutral-50`, tid som `relativeTime` med fullt datum i `title`.
- **Länkar i text:** `text-brand-600 hover:text-brand-700 underline-offset-2 hover:underline`.
- **Tillgänglighet:** alla ikon-knappar har `aria-label`; statusmeddelanden i
  `aria-live`; kontrast ≥ 4.5:1 för text; fokus synligt överallt.

## 6. Får inte ändras i den här körningen

- Server actions (`lib/actions/*`), `lib/db`, `lib/auth*`, `middleware.ts`, API-routes.
- Formulärfältens `name`-attribut och knapptexterna "Spara", "Spara hela sidan",
  "Nytt inlägg", "Ladda upp fil", "Skapa kundanvändare", "Skapa sajt", "Ta bort",
  "Spara nytt lösenord", "Logga in", "Logga ut" (E2E-skripten i `scripts/` letar
  efter dem med `getByRole("button", { name })`). Texten "Sparat ✓" ska fortfarande
  visas i blockeditorns sektion efter en sparning. Blockeditorns grupper ska
  fortsatt vara `<section>`-element som innehåller sina fält och sin "Spara"-knapp.
- Markdown-lagringen och `RichTextEditor`s uppsättning av verktyg.
