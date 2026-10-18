import type { Guide } from "../types";

const guide: Guide = {
  slug: "uppdatera-priser-pa-hemsidan",
  audience: "smaforetag",
  title: "Uppdatera priser på hemsidan: moms och från-pris",
  h1: "Uppdatera priser på hemsidan – prislista, moms och \"från\"-priser",
  description:
    "Så uppdaterar du tjänstepriser på hemsidan utan att missa något: regler om moms och \"från\"-priser, var priset gömmer sig och hur du meddelar en prishöjning.",
  primaryQuery: "uppdatera priser på hemsidan",
  published: "2026-10-18",
  modified: "2026-10-18",
  intro: [
    "För att uppdatera priser på hemsidan ändrar du först prislistan i ditt redigeringsverktyg och sedan varje annat ställe där samma pris står: tjänstesidor, PDF:er, Google Företagsprofil och bokningssystem. Säljer du till privatpersoner ska priset anges inklusive moms.",
    "Den här guiden gäller tjänstepriser för småföretag, inte e-handel. Den går igenom reglerna, en checklista för var priserna finns och hur du berättar om en prishöjning.",
  ],
  summary: [
    "Till konsumenter: ange totalpriset **inklusive moms** och skriv ut eventuella extra avgifter.",
    "Kan du inte ange ett fast pris, ange hur priset räknas (t.ex. timpris plus material).",
    "\"Från\"-priser är inte förbjudna, men priset måste gå att få och det ska framgå vad som höjer det.",
    "Gör en lista över alla ställen priset står innan du ändrar, och ändra allt samma dag.",
    "Meddela prishöjningar med datum: \"Nya priser från 1 mars\".",
  ],
  sections: [
    {
      id: "vad-galler-for-priser",
      heading: "Vad lagen säger om priser på hemsidan",
      blocks: [
        {
          type: "p",
          text: "Prisinformationslagen gäller företag som säljer varor eller tjänster till **konsumenter**, alltså privatpersoner. Lagen definierar pris som det slutliga priset inklusive mervärdesskatt och andra skatter. Konsumentverket skriver att huvudregeln vid försäljning på internet är att det visade priset ska vara totalpriset med moms, och att extra avgifter ska framgå tydligt.",
        },
        {
          type: "p",
          text: "Säljer du bara till företag gäller inte prisinformationslagen, och då är det vanligt att ange priser **exklusive moms**. Har du både privat- och företagskunder är det säkrast att visa priset inklusive moms och gärna exklusive moms bredvid, tydligt märkt.",
        },
        {
          type: "p",
          text: "För tjänster går det ofta inte att ge ett fast pris i förväg. Då säger lagen att du i stället ska ange **grunderna för hur priset bestäms**. Konsumentverket ger exempel som timpris för arbete och pris per enhet för material. Krav på jämförpris (kr/kg, kr/liter) gäller varor, inte tjänster i allmänhet.",
        },
        {
          type: "warning",
          title: "Ungefärligt pris har en gräns",
          text: "Lämnar du ett ungefärligt pris på en tjänst till en konsument får slutpriset som huvudregel inte överstiga det med mer än **15 procent**, om ni inte avtalat något annat (36 § konsumenttjänstlagen). Skriv därför inte \"cirka\" om du inte menar det.",
        },
      ],
    },
    {
      id: "fran-priser",
      heading: "Får du skriva \"från\"-priser?",
      blocks: [
        {
          type: "p",
          text: "Det finns inget förbud mot \"från\" i prisinformationslagen. Men informationen ska vara korrekt och tydlig, och marknadsföringslagen förbjuder vilseledande uppgifter om priset och om grunderna för prisberäkningen. Ett \"från\"-pris som nästan ingen kund får riskerar att räknas som vilseledande.",
        },
        {
          type: "ul",
          items: [
            "Priset ska gå att köpa till i verkligheten, inte bara i undantagsfall.",
            "Skriv vad som ingår i lägsta priset och vad som gör det dyrare, t.ex. \"från xxx kr för kort hår, längre hår kostar mer\".",
            "Kampanjer: om du skriver att ett pris är sänkt ska du även ange det lägsta pris du tagit de senaste 30 dagarna (7 a § prisinformationslagen).",
          ],
        },
      ],
    },
    {
      id: "upplagg-per-bransch",
      heading: "Exempel på prislisteupplägg per bransch",
      blocks: [
        {
          type: "p",
          text: "Tabellen visar **format**, inte marknadspriser. Byt \"xxx\" mot dina egna siffror.",
        },
        {
          type: "table",
          caption: "Upplägg för tjänstepriser (exempel på format)",
          head: ["Bransch", "Upplägg", "Så kan en rad se ut", "Tänk på"],
          rows: [
            [
              "Frisör",
              "Fast pris per behandling, ofta efter hårlängd",
              "Klippning, kort hår: xxx kr",
              "Konsumentpris, alltså inkl. moms. Skriv vad som ingår (tvätt, styling).",
            ],
            [
              "Snickare",
              "Timpris plus material och ev. framkörning",
              "Timpris xxx kr inkl. moms. Material debiteras enligt åtgång.",
              "Ange grunderna för priset. Ge fast pris eller offert för större jobb.",
            ],
            [
              "Redovisningsbyrå",
              "Månadspaket efter volym",
              "Bas: xxx kr/mån exkl. moms, upp till xx verifikationer",
              "Exkl. moms fungerar mot företag. Deklarationshjälp till privatpersoner visas inkl. moms.",
            ],
            [
              "Bilverkstad",
              "Fast pris för servicepaket plus timpris för reparationer",
              "Oljebyte inkl. filter: från xxx kr (beror på bilmodell)",
              "Skriv vad som styr priset. Ungefärliga priser binder dig inom 15 procent.",
            ],
          ],
        },
      ],
    },
    {
      id: "steg-for-steg",
      heading: "Så uppdaterar du priserna utan att missa något",
      blocks: [
        {
          type: "p",
          text: "Det vanligaste felet är inte att prislistan blir fel, utan att det gamla priset ligger kvar någon annanstans. Gör så här:",
        },
        {
          type: "ol",
          items: [
            "**Inventera.** Sök i Google på `site:dinsajt.se kr` och gå igenom sajtens menyer. Notera varje sida där ett pris står.",
            "**Uppdatera prislistan** i ditt verktyg. I WordPress, Wix och Squarespace redigerar du sidan direkt i redigeraren. Se [ändra text på hemsidan](/guider/andra-text-pa-hemsidan) om du är osäker på hur.",
            "**Uppdatera tjänstesidorna**, startsidan, kampanjrutor och svar i vanliga frågor där priset nämns.",
            "**Byt ut PDF:er.** En gammal prislista som PDF kan ligga kvar i Google långt efter att länken tagits bort. Ersätt filen eller ta bort den helt.",
            "**Google Företagsprofil.** Många tjänsteföretag kan lägga in tjänster med pris och beskrivning direkt i profilen. Har du gjort det, ändra där också.",
            "**Bokningssystemet.** Om du tar bokningar via ett externt system ligger priserna oftast där separat, och det är det priset kunden ser när hen bokar.",
            "**Kontrollera moms och mobil.** Läs igenom allt på telefonen och se att det står \"inkl. moms\" eller \"exkl. moms\" där det behövs.",
          ],
        },
        {
          type: "tip",
          title: "Byggd av en byrå?",
          text: "Ligger priserna i koden får du be utvecklaren om varje ändring, vilket kostar tid och pengar (se [vad en textändring kostar](/guider/vad-kostar-en-textandring)). Är sajten byggd i Next.js kan utvecklaren lägga priserna som redigerbara fält i ett CMS som [sitecms](/docs), så att du ändrar dem själv.",
        },
      ],
    },
    {
      id: "prishojning",
      heading: "Hur ofta du bör se över priserna och hur du meddelar en höjning",
      blocks: [
        {
          type: "p",
          text: "Gå igenom prislistan minst en gång om året och när dina kostnader ändras. Passa på att se över [öppettiderna](/guider/andra-oppettider-pa-hemsidan) samtidigt, eftersom de ofta glöms bort på samma sätt.",
        },
        {
          type: "ul",
          items: [
            "Skriv ett datum: \"Nya priser från 1 mars 2027\". Visa gärna de gamla priserna fram till dess med \"gäller till och med 28 februari\".",
            "Lägg en kort notis på prislistan eller startsidan och ta bort den när höjningen gått igenom.",
            "Berätta direkt för fasta kunder, till exempel via e-post, i stället för att låta dem upptäcka det på sajten.",
            "Ett pris du redan har lovat i en offert eller ett avtal ändras inte av att du uppdaterar hemsidan. Vad som gäller för pågående avtal styrs av avtalsvillkoren.",
          ],
        },
        {
          type: "p",
          text: "Lanserar du en ny tjänst samtidigt kan du läsa hur du [lägger till en tjänst på hemsidan](/guider/lagga-till-tjanst-pa-hemsidan).",
        },
      ],
    },
  ],
  faq: [
    {
      q: "Måste jag visa priser inklusive moms på hemsidan?",
      a: "Ja, om du säljer till privatpersoner. Prisinformationslagen definierar priset som det slutliga priset inklusive moms och andra skatter. Säljer du bara till företag gäller inte lagen, och då är priser exklusive moms vanliga.",
    },
    {
      q: "Får jag skriva \"från\"-pris på mina tjänster?",
      a: "Ja, det finns inget förbud. Men priset måste gå att få och du ska förklara vad som gör tjänsten dyrare, annars kan det bli vilseledande enligt marknadsföringslagen.",
    },
    {
      q: "Måste priser stå på hemsidan?",
      a: "Nej, det finns inget generellt krav på att publicera prislista. Men om du anger pris för en bestämd tjänst gäller reglerna fullt ut. Konsumentverket skriver att företag vars tjänster är svåra att prissätta i förväg ska kunna förklara hur prissättningen går till.",
    },
    {
      q: "Hur meddelar jag en prishöjning på hemsidan?",
      a: "Skriv ett tydligt datum för när de nya priserna gäller och lägg en notis på prislistan. Kontakta befintliga kunder direkt. Redan lämnade offerter och avtal påverkas inte av att du ändrar sajten.",
    },
    {
      q: "Vad gör jag om ett gammalt pris syns i Google?",
      a: "Kontrollera först att priset är ändrat överallt på sajten, inklusive PDF:er. Google uppdaterar sina sökresultat när sidan crawlas på nytt. Det kan gå snabbare om du begär indexering i Google Search Console.",
    },
  ],
  sources: [
    { title: "Prisinformationslag (2004:347) – lagen.nu", url: "https://lagen.nu/2004:347" },
    {
      title: "Prisinformationslag (2004:347) – Riksdagen",
      url: "https://www.riksdagen.se/sv/dokument-lagar/dokument/svensk-forfattningssamling/prisinformationslag-2004347_sfs-2004-347",
    },
    { title: "Prisinformationslagen – Konsumentverket", url: "https://www.konsumentverket.se/lagar/prisinformationslagen-konsument/" },
    {
      title: "Prisinformation – regler för företag – Konsumentverket",
      url: "https://www.konsumentverket.se/marknadsratt-foretag/prisinformation-regler-for-foretag/",
    },
    {
      title: "Prissänkningar – regler för företag – Konsumentverket",
      url: "https://www.konsumentverket.se/marknadsratt-foretag/prissankningar-regler-for-foretag/",
    },
    {
      title: "Vägledning om prisinformation (2022) – Konsumentverket",
      url: "https://www.svenskhandel.se/api/documents/konsumentverkets-vagledning-prisinformation-2022.pdf",
    },
    { title: "Marknadsföringslag (2008:486) – lagen.nu", url: "https://lagen.nu/2008:486" },
    { title: "Konsumenttjänstlag (1985:716) – lagen.nu", url: "https://lagen.nu/1985:716" },
    { title: "Manage your services on your Business Profile – Google", url: "https://support.google.com/business/answer/9455399?hl=en" },
    { title: "URL Inspection tool – Google Search Console", url: "https://support.google.com/webmasters/answer/9012289?" },
  ],
  related: ["lagga-till-tjanst-pa-hemsidan", "andra-text-pa-hemsidan", "andra-oppettider-pa-hemsidan"],
  cta: "kund",
};

export default guide;
