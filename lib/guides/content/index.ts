import type { Guide } from "../types";
import andraTextPaHemsidan from "./andra-text-pa-hemsidan";
import bytaBildPaHemsidan from "./byta-bild-pa-hemsidan";
import uppdateraPriserPaHemsidan from "./uppdatera-priser-pa-hemsidan";
import andraOppettiderPaHemsidan from "./andra-oppettider-pa-hemsidan";
import laggaUppNyheterPaHemsidan from "./lagga-upp-nyheter-pa-hemsidan";
import laggaTillTjanstPaHemsidan from "./lagga-till-tjanst-pa-hemsidan";
import vadKostarEnTextandring from "./vad-kostar-en-textandring";
import andraHemsidaByggdINextjs from "./andra-hemsida-byggd-i-nextjs";
import latKundenRedigeraNextjs from "./lat-kunden-redigera-nextjs";
import overlamnaHemsidaTillKund from "./overlamna-hemsida-till-kund";

/** Våg 1 (18 oktober 2026). Ordningen styr ordningen på /guider. */
export const WAVE_1: Guide[] = [
  andraTextPaHemsidan,
  bytaBildPaHemsidan,
  uppdateraPriserPaHemsidan,
  andraOppettiderPaHemsidan,
  laggaUppNyheterPaHemsidan,
  laggaTillTjanstPaHemsidan,
  vadKostarEnTextandring,
  andraHemsidaByggdINextjs,
  latKundenRedigeraNextjs,
  overlamnaHemsidaTillKund,
];
