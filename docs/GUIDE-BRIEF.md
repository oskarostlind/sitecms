# Brief: guider på sitecms.se (våg 1)

## Varför guiderna finns

sitecms.se är en ny domän utan länkar. Vi rankar inte på huvudtermer ("cms",
"headless cms", "vad kostar en hemsida") — de är låsta. Vi rankar på
**situationsfrågor** där de svenska sökresultaten idag är forumtrådar,
kommunala PDF-lathundar, maskinöversatta utländska sidor (seahawkmedia/sv,
wpbeginner/sv, hostragons/sv, ranktracker/sv) och byråers säljsidor.

Varje guide ska vara **det bästa svaret på svenska** på sin fråga: konkret,
aktuellt (2026), plattformsoberoende och ärligt. Inte en säljsida. Den som
läser ska kunna lösa sitt problem även om hen aldrig blir kund.

## Format (tekniskt)

- En fil per guide: `lib/guides/content/<slug>.ts`, `export default guide` av typen
  `Guide` från `lib/guides/types.ts` (läs typen och kommentarerna noga).
- `published` och `modified`: `"2026-10-18"`.
- Inline-markup i strängar: `**fet**`, `` `kod` ``, `[text](/guider/slug)`,
  `[text](https://extern.se)`. Ingen HTML.
- Kontrollera med: `npx tsx scripts/check-guides.ts <slug>` — måste ge ✔.
  Krav: title + " | sitecms" ≤ 60 tecken, description 110–160 tecken, ≥ 4
  avsnitt, ≥ 4 FAQ, ≥ 1 tabell, ≥ 3 interna länkar i texten, **750–1 400 ord**.
- Interna länkar får bara gå till: `/guider` och guiderna i våg 1 (listan
  nedan), `/docs`, `/signup`. Länka naturligt där det hjälper läsaren.

## Ton och kvalitet

- Svenska, du-tilltal, rak och varm. Korta stycken (2–4 meningar). Ingen
  floskelinledning ("I dagens digitala värld…"). Första meningen i `intro`
  svarar på frågan.
- `summary` ("Kort svar"): 3–5 punkter som ensamma löser problemet.
- Plattformsoberoende: täck WordPress, Wix, Squarespace/One.com-byggare,
  byråbyggd/egenutvecklad sajt (Next.js/React) där det är relevant. Säg ärligt
  när något bara går i vissa system.
- Konkreta steg (`ol`), konkreta tabeller med verkliga uppgifter, konkreta
  exempel (bransch: frisör, snickare, café, redovisningsbyrå, bilverkstad).
- **Uppfinn aldrig fakta, siffror, priser, regler eller datum.** Allt sådant
  ska verifieras med WebSearch/WebFetch och källan läggas i `sources` (titel +
  URL). Kan du inte verifiera något — skriv om det utan siffran, eller utelämna.
- Inga påhittade citat, kundcase, statistik eller "studier visar".
- Använd sparsamt tankstreck (—); variera med punkt och kommatecken.
- FAQ: frågor som en riktig person skulle skriva i Google; svar 2–4 meningar
  som står på egna ben.

## Om sitecms (bara det som är sant — nämn sparsamt)

Nämn sitecms högst 1–2 gånger i brödtexten, där det verkligen är ett relevant
alternativ (t.ex. "om sajten är byggd i Next.js"), aldrig som enda lösning.
CTA-rutan i slutet läggs till automatiskt via `cta`.

Sant om sitecms:
- Svenskt CMS. Kunden (redaktören) redigerar texter, bilder (med alt-text),
  nyheter/inlägg (publicera/avpublicera), tjänster och priser, SEO-titel och
  beskrivning per sida, via strukturerade fält — kan inte ha sönder layouten.
- Ångra senaste ändringen; aktivitetslogg som visar vem som ändrade vad och när.
- Ändringar syns på sajten inom sekunder (revalidering).
- Fungerar för sajter byggda i **Next.js** (App Router). Utvecklaren kopplar
  sajten med npm-paketet `sitecms-next`, deklarerar fälten i
  `sitecms.config.ts`, och bjuder in kunden via e-post som redaktör.
- Gratis att börja. Ägare och redaktörer per sajt.
- Det är INTE: en hemsidebyggare, ett WordPress-tillägg, ett e-handelssystem,
  och fungerar inte för Wix/Squarespace/WordPress-sajter.

## Våg 1 (slug → primär fråga)

| slug | målgrupp | primär fråga |
|---|---|---|
| andra-text-pa-hemsidan | smaforetag | ändra text på hemsidan själv |
| andra-hemsida-byggd-i-nextjs | smaforetag | hemsida byggd i react/next.js ändra själv |
| uppdatera-priser-pa-hemsidan | smaforetag | uppdatera priser på hemsidan |
| byta-bild-pa-hemsidan | smaforetag | byta bild på hemsidan |
| andra-oppettider-pa-hemsidan | smaforetag | ändra öppettider på hemsidan |
| lagga-upp-nyheter-pa-hemsidan | smaforetag | lägga upp nyheter på hemsidan |
| lagga-till-tjanst-pa-hemsidan | smaforetag | lägga till ny tjänst på hemsidan |
| vad-kostar-en-textandring | smaforetag | kostnad ändra text på hemsida webbyrå |
| lat-kunden-redigera-nextjs | utvecklare | låta kunden redigera innehåll next.js |
| overlamna-hemsida-till-kund | utvecklare | överlämna hemsida till kund |
