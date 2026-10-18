import type { Guide } from "../types";

const guide: Guide = {
  slug: "lagga-till-tjanst-pa-hemsidan",
  audience: "smaforetag",
  title: "Lägga till tjänst på hemsidan: mall och exempel",
  h1: "Lägga till en ny tjänst på hemsidan – så bygger du en tjänstesida som säljer och syns",
  description:
    "Så lägger du till en ny tjänst på hemsidan: egen sida eller lista, en färdig mall för tjänstesidan, exempel på SEO-titlar och en checklista efter publicering.",
  primaryQuery: "lägga till ny tjänst på hemsidan",
  published: "2026-10-18",
  modified: "2026-10-18",
  intro: [
    "För att lägga till en ny tjänst på hemsidan skapar du en egen sida för tjänsten, fyller den enligt en fast mall och länkar till den från menyn, startsidan och prislistan. Ge sidan en egen SEO-titel och meta-beskrivning så att den kan hittas i Google.",
    "Guiden fungerar oavsett om sajten är byggd i WordPress, Wix, Squarespace eller av en byrå. Du får en mall, exempel per bransch och en checklista.",
  ],
  summary: [
    "Ge tjänsten en **egen sida** om kunder söker efter just den eller om den behöver förklaras.",
    "Följ mallen: rubrik, för vem, vad ingår, hur det går till, pris, vanliga frågor och kontakt.",
    "Skriv en unik SEO-titel och meta-beskrivning för sidan.",
    "Länka till sidan från menyn eller tjänsteöversikten, startsidan och prislistan.",
    "Kontrollera sidan på mobilen och i Google Search Console efter publicering.",
  ],
  sections: [
    {
      id: "egen-sida-eller-lista",
      heading: "En sida per tjänst eller en samlad lista?",
      blocks: [
        {
          type: "p",
          text: "Det beror på om tjänsten är något folk söker efter för sig. En snickare som börjar bygga altaner har nytta av en egen sida, eftersom \"bygga altan\" är en egen sökning med egna frågor. En frisör som lägger till en ny färgbehandling klarar sig ofta med en rad i prislistan.",
        },
        {
          type: "table",
          caption: "När du väljer egen sida eller samlad lista",
          head: ["", "Egen sida per tjänst", "Samlad lista"],
          rows: [
            ["Passar när", "Tjänsten söks för sig, kräver förklaring eller har ett högre pris", "Tjänsterna är små, liknar varandra och prissätts styckvis"],
            ["För Google", "Egen titel, beskrivning och URL som kan matcha en specifik sökning", "En sida som täcker flera närliggande sökningar mer allmänt"],
            ["För läsaren", "Allt om en tjänst på ett ställe, lätt att jämföra och kontakta", "Snabb överblick, bra för den som redan vet vad hen vill ha"],
            ["Exempel", "Altanbygge, bokslut, AC-service", "Klippning, färg, slingor"],
          ],
        },
        {
          type: "p",
          text: "Många sajter gör båda: en översiktssida med alla tjänster som länkar vidare till egna sidor för de viktigaste. Undvik att skapa flera nästan likadana sidor för samma tjänst, det hjälper varken läsaren eller sökmotorerna.",
        },
      ],
    },
    {
      id: "mall-for-tjanstesida",
      heading: "Mall för en tjänstesida",
      blocks: [
        {
          type: "p",
          text: "Följ samma ordning på alla tjänstesidor. Då blir de lätta att skriva och lätta att läsa. Exemplet nedan gäller en påhittad snickerifirma.",
        },
        {
          type: "table",
          caption: "Strukturmall för en tjänstesida (exempel: altanbygge)",
          head: ["Del", "Vad den ska svara på", "Exempel"],
          rows: [
            ["Rubrik (H1)", "Vad är tjänsten och var?", "Altanbygge i Västerås"],
            ["För vem", "Vem passar tjänsten för?", "Villaägare som vill ha ny altan eller byta ut en gammal"],
            ["Vad ingår", "Vad får kunden konkret?", "Ritning, bygglovsunderlag vid behov, material, bygge och städning"],
            ["Hur det går till", "Vilka steg, hur lång tid?", "Hembesök, offert, bygge, slutbesiktning tillsammans"],
            ["Pris eller prisindikation", "Vad kostar det, eller hur räknas priset?", "Fast pris efter offert, eller timpris plus material"],
            ["Vanliga frågor", "Vad undrar kunder innan de hör av sig?", "Behövs bygglov? Vilket virke använder ni?"],
            ["Uppmaning", "Vad ska läsaren göra nu?", "Knapp: Boka hembesök, plus telefonnummer"],
          ],
        },
        {
          type: "p",
          text: "Om priset: säljer du till privatpersoner ska ett angivet pris vara inklusive moms, och kan du inte ange ett fast pris ska du förklara hur det räknas. Mer om det i guiden om att [uppdatera priser på hemsidan](/guider/uppdatera-priser-pa-hemsidan).",
        },
      ],
    },
    {
      id: "skapa-sidan",
      heading: "Så skapar du sidan i ditt system",
      blocks: [
        {
          type: "ol",
          items: [
            "**Skapa en ny sida.** I WordPress, Wix och Squarespace lägger du till en sida i redigeraren. Det enklaste är ofta att kopiera en befintlig tjänstesida så att layouten blir densamma.",
            "**Välj en beskrivande adress**, t.ex. `/tjanster/altanbygge`. Google skriver att ord i URL:en hjälper användare mer än slumpmässiga id:n.",
            "**Fyll i mallen** ovan och lägg till en bild med beskrivande alt-text.",
            "**Skriv SEO-titel och meta-beskrivning** i sidans SEO-inställningar (se exemplen nedan).",
            "**Publicera** och länka till sidan enligt nästa avsnitt.",
          ],
        },
        {
          type: "p",
          text: "Är sajten byggd av en byrå eller utvecklare utan redigeringsverktyg måste du oftast be dem lägga upp sidan. Är den byggd i Next.js kan utvecklaren ge dig ett CMS där tjänster finns som färdiga fält, till exempel [sitecms](/docs). Läs mer i [ändra en hemsida byggd i Next.js](/guider/andra-hemsida-byggd-i-nextjs).",
        },
      ],
    },
    {
      id: "seo-titel-och-beskrivning",
      heading: "Exempel på SEO-titel och meta-beskrivning",
      blocks: [
        {
          type: "p",
          text: "Google rekommenderar att varje sida har en unik, beskrivande titel och en meta-beskrivning som sammanfattar just den sidan. Det finns ingen fast teckengräns, men långa texter kortas av i sökresultaten. Nedan är **påhittade exempel** att utgå från.",
        },
        {
          type: "table",
          caption: "Exempel (påhittade företag)",
          head: ["Bransch", "SEO-titel", "Meta-beskrivning"],
          rows: [
            ["Frisör", "Balayage i Örebro | Salong Linnea", "Naturlig balayage anpassad efter din hårlängd. Konsultation ingår. Se priser och boka tid online hos Salong Linnea i centrala Örebro."],
            ["Snickare", "Altanbygge i Västerås | Berg Snickeri", "Vi bygger altaner från ritning till färdigt golv, med bygglovsunderlag vid behov. Boka ett kostnadsfritt hembesök för offert."],
            ["Redovisningsbyrå", "Bokslut för aktiebolag | Ekonomibyrån Norr", "Vi tar hand om bokslut och årsredovisning för små aktiebolag. Fast månadspris, personlig kontakt och digital hantering."],
            ["Bilverkstad", "AC-service för bil i Luleå | Norrbil Verkstad", "AC-service med läcksökning och påfyllning av köldmedium. Se vad som ingår, vad det kostar och boka tid direkt."],
          ],
        },
        {
          type: "tip",
          title: "Lova bara det som stämmer",
          text: "Skriv \"kostnadsfritt hembesök\" eller \"fast pris\" bara om det faktiskt gäller. Meta-beskrivningen är marknadsföring och ska vara lika korrekt som resten av sidan.",
        },
      ],
    },
    {
      id: "lanka-till-tjansten",
      heading: "Länka till tjänsten från startsidan och menyn",
      blocks: [
        {
          type: "p",
          text: "Google hittar främst nya sidor via länkar från sidor den redan känner till, och skriver att varje viktig sida bör ha en länk från minst en annan sida på sajten. En sida som bara går att nå via sökning blir lätt bortglömd, både av besökare och sökmotorer.",
        },
        {
          type: "ul",
          items: [
            "**Menyn:** lägg tjänsten under \"Tjänster\" eller som egen menypunkt om den är central.",
            "**Startsidan:** nämn tjänsten i tjänsteöversikten, gärna med en kort rad och en länk.",
            "**Prislistan och relaterade tjänster:** länka från raden i prislistan och från närliggande tjänstesidor.",
            "**Nyhet:** berätta om tjänsten i ett inlägg, se [lägga upp nyheter på hemsidan](/guider/lagga-upp-nyheter-pa-hemsidan).",
            "**Länktext:** skriv vad sidan handlar om, t.ex. \"altanbygge\", inte \"klicka här\" eller \"läs mer\".",
          ],
        },
      ],
    },
    {
      id: "checklista",
      heading: "Checklista efter publicering",
      blocks: [
        {
          type: "ul",
          items: [
            "Öppna sidan på mobilen. Fungerar knappar, telefonnummer och formulär?",
            "Stämmer priset och står det inkl. eller exkl. moms?",
            "Syns tjänsten i menyn, på startsidan och i prislistan?",
            "Lägg till tjänsten i Google Företagsprofil om din bransch har stöd för tjänster där.",
            "Lägg in tjänsten i bokningssystemet om kunder bokar online.",
            "Använd URL-inspektionen i Google Search Console och begär indexering. Det garanterar inte att sidan indexeras, men kan gå snabbare.",
            "Ta bort eller uppdatera texter som säger att du inte erbjuder tjänsten, t.ex. i vanliga frågor. Se [ändra text på hemsidan](/guider/andra-text-pa-hemsidan).",
          ],
        },
      ],
    },
  ],
  faq: [
    {
      q: "Ska varje tjänst ha en egen sida på hemsidan?",
      a: "Inte alltid. Ge tjänsten en egen sida om kunder söker efter den specifikt eller om den behöver förklaras. Små, likartade tjänster fungerar bra i en samlad lista.",
    },
    {
      q: "Vad ska stå på en tjänstesida?",
      a: "Vad tjänsten är, vem den passar, vad som ingår, hur det går till, pris eller hur priset räknas, vanliga frågor och hur kunden tar kontakt. Håll samma ordning på alla tjänstesidor.",
    },
    {
      q: "Ska priset synas på tjänstesidan?",
      a: "Det är inget generellt krav, men ett pris eller en prisindikation hjälper kunden att bestämma sig. Anger du pris till privatpersoner ska det vara inklusive moms, och kan du inte ge ett fast pris bör du förklara hur priset räknas.",
    },
    {
      q: "Hur lång ska texten på en tjänstesida vara?",
      a: "Så lång som behövs för att svara på kundens frågor. Google skriver att det inte finns något magiskt antal ord, varken minimum eller maximum. Täck mallens delar och sluta där.",
    },
    {
      q: "Hur får jag Google att hitta den nya tjänstesidan?",
      a: "Länka till den från menyn och startsidan så att Google hittar den när sajten crawlas. Du kan också begära indexering i Google Search Console, men det är ingen garanti.",
    },
  ],
  sources: [
    { title: "SEO Starter Guide – Google Search Central", url: "https://developers.google.com/search/docs/fundamentals/seo-starter-guide" },
    { title: "Influencing title links in Google Search – Google Search Central", url: "https://developers.google.com/search/docs/appearance/title-link" },
    { title: "How to write meta descriptions – Google Search Central", url: "https://developers.google.com/search/docs/appearance/snippet" },
    {
      title: "Link best practices for Google – Google Search Central",
      url: "https://developers.google.com/search/docs/crawling-indexing/links-crawlable?num=100",
    },
    { title: "URL Inspection tool – Google Search Console", url: "https://support.google.com/webmasters/answer/9012289?" },
    { title: "Manage your services on your Business Profile – Google", url: "https://support.google.com/business/answer/9455399?hl=en" },
    { title: "Prisinformationslagen – Konsumentverket", url: "https://www.konsumentverket.se/lagar/prisinformationslagen-konsument/" },
  ],
  related: ["uppdatera-priser-pa-hemsidan", "lagga-upp-nyheter-pa-hemsidan", "andra-text-pa-hemsidan"],
  cta: "kund",
};

export default guide;
