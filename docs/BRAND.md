# Varumärke och formspråk (gemensamt för hela sitecms)

Princip: **mörk ram, ljus läsyta.** Landningssidan (`app/page.tsx`, `app/landing.css`)
sätter identiteten. Övriga sidor bär med sig den i ramen (header, hero, footer,
sidomeny, inloggningens sidopanel) men har ljus yta där man läser och arbetar.

## Färger (Tailwind-tokens i app/globals.css)

| Token | Användning |
|---|---|
| `space-950` #04060f, `space-900`, `space-850`, `space-800`, `space-700`, `space-600`, `space-500` | Mörka ytor: header, hero, footer, sidomeny. 950/900 är bakgrund, 800/700 kort och ytor ovanpå, 600/500 kanter (`border-white/10` funkar också). |
| `ink` #f3f6ff, `ink-muted` #9aa6c4, `ink-subtle` #6b7796 | Text på mörk bakgrund. |
| `brand-400` #5df0a8 (mint) | Accent: primärknappar (mörk text `brand-950`), markeringar, aktiv meny på mörk yta, ikoner på mörk yta. |
| `brand-300` | Hover på mint. |
| `brand-500` | Dekor, fokusringar (`ring-brand-500/50`). |
| `brand-600`, `brand-700` | **Grön text/ikon på ljus bakgrund** (länkar, eyebrows, aktiv flik). Ren mint är oläslig på vitt — använd aldrig `text-brand-400` på ljus yta. |
| `neutral-*` | Ljusa läsytor som tidigare. |

Den gamla blå paletten är borta (brand-* är nu grön/mint). Sök efter hårdkodade
blå färger (`#2450d1`, `#3a68e6`, `#121f47`, `blue-`, `indigo-`, `sky-`) och byt.

## Komponenter

- `Logo` / `LogoMark` från `@/components/ui` — **enda loggan**. `tone="dark"` på mörk yta (ljus text), `tone="light"` på ljus yta.
- `SpaceBackdrop` från `@/components/brand/SpaceBackdrop` — rymdbakgrund (CSS-stjärnor, valfri planet: `planet="corner" | "center" | "none"`). Ingen WebGL utanför startsidan.
- `Button` primary = mint med mörk text (som landningen). `secondary` på mörk yta: använd `border-white/15 bg-white/5 text-ink hover:bg-white/10` via className.
- Rundning: kort 16–18px (`rounded-2xl`), knappar på publika sidor `rounded-full` som landningen, i panelen `rounded-lg` som idag.
- Typsnitt: Inter (redan globalt). Rubriker på mörk yta: `font-extrabold tracking-[-0.02em]`.
- Glaseffekt (landningens kort): `bg-white/[0.04] border border-white/10 backdrop-blur` på mörka ytor.

## Regler

- Läsbarhet först: guider, dokumentation och panelens arbetsytor förblir ljusa.
- Kontrast AA: ljus text på space-ytor, mörk text på mint, grön `brand-700` för länkar på vitt.
- Inga nya beroenden. Ingen WebGL utanför `/`.
- Respektera `prefers-reduced-motion`.
