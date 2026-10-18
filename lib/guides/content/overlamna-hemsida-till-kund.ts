import type { Guide } from "../types";

const guide: Guide = {
  slug: "overlamna-hemsida-till-kund",
  audience: "utvecklare",
  title: "Överlämna hemsida till kund: checklista",
  h1: "Överlämna en hemsida till kunden: checklista för utvecklare (inloggningar, ägarskap, redigering)",
  description:
    "Checklista för att överlämna en hemsida till kunden: vem som ska äga domän, hosting och konton, mejlmall, kundutbildning på 15 minuter och support efteråt.",
  primaryQuery: "överlämna hemsida till kund",
  published: "2026-10-18",
  modified: "2026-10-18",
  intro: [
    "En bra överlämning betyder att kunden äger sina viktigaste tillgångar, kan logga in själv, vet hur man gör vanliga ändringar och vet vart man vänder sig när något är tekniskt. Allt det ska vara klart och testat innan du skickar sista fakturan.",
    "Checklistan nedan gäller oavsett om sajten är byggd i Next.js, WordPress eller en hemsidebyggare. Det som skiljer är mest var kontona ligger.",
  ],
  summary: [
    "Kunden ska äga **domänen, Google-kontona och CMS-kontot**. Du kan ha behörighet, men inte vara ensam ägare.",
    "Dela inloggningar via en lösenordshanterare, aldrig i klartext i mejl.",
    "Bjud in kunden som redaktör i CMS:et och låt hen göra en riktig ändring medan du ser på.",
    "Skriv en kort \"så här ändrar du\"-guide och skicka den tillsammans med en sammanfattning i ett mejl.",
    "Bestäm skriftligt vad kunden gör själv och vad som är teknisk support.",
  ],
  sections: [
    {
      id: "vem-ager-vad",
      heading: "Tillgångar och vem som ska äga dem",
      blocks: [
        {
          type: "p",
          text: "Den vanligaste konflikten efter ett avslutat uppdrag handlar inte om koden, utan om att domänen eller Google-kontot ligger i utvecklarens namn. Gå igenom tabellen tillsammans med kunden.",
        },
        {
          type: "table",
          caption: "Tillgångar vid överlämning",
          head: ["Tillgång", "Vem bör äga", "Varför", "Vanlig fallgrop"],
          rows: [
            [
              "Domän hos registrar",
              "Kunden, som innehavare",
              "Domänen är företagets adress och kan inte bytas utan förluster",
              "Registrerad i byråns namn, kunden kan inte flytta den",
            ],
            [
              "DNS",
              "Kunden, du kan ha behörighet",
              "Styr sajt, e-post och verifieringar",
              "Ingen vet vilka poster som behövs för e-posten",
            ],
            [
              "Hosting / Vercel-konto",
              "Kunden, eller du enligt avtal",
              "Den som äger kontot betalar och styr driften",
              "Projektet ligger i ditt privata konto",
            ],
            [
              "Repo (GitHub, GitLab)",
              "Enligt avtal, kunden bör ha en kopia",
              "Utan koden kan ingen annan ta över",
              "Ingen har skrivit ner vem som äger koden",
            ],
            [
              "CMS-konto",
              "Kunden som redaktör, du som ägare eller tvärtom",
              "Kunden ska kunna ändra innehåll utan dig",
              "Kunden loggar in med ditt konto",
            ],
            [
              "E-post, SPF och DKIM",
              "Kunden",
              "Felaktiga poster gör att mejl hamnar i skräpposten",
              "DNS byts vid lansering och e-posten slutar fungera",
            ],
            [
              "Google Företagsprofil",
              "Kunden som primär ägare",
              "Syns i Google Maps och lokala sökningar",
              "Byrån är primär ägare och slutar svara",
            ],
            [
              "Search Console",
              "Kunden som verifierad ägare",
              "Visar sökord, fel och indexering",
              "Bara utvecklarens verifiering finns",
            ],
            [
              "Analysverktyg",
              "Kunden som administratör",
              "Historiken tillhör verksamheten",
              "Kontot skapades i ditt namn",
            ],
            [
              "Bildlicenser",
              "Kunden, eller dokumenterat vem",
              "Licensen kan vara knuten till den som köpte den",
              "Bilderna köptes på byråns konto",
            ],
            [
              "Kontaktformulärets mottagare",
              "Kundens adress",
              "Förfrågningar ska inte gå via dig",
              "Formuläret skickar fortfarande till din testadress",
            ],
          ],
        },
        {
          type: "p",
          text: "Ligger projektet i ditt Vercel-konto kan det flyttas till kundens team utan driftstopp. Enligt [Vercels dokumentation](https://vercel.com/docs/projects/transferring-projects), oktober 2026, måste du vara ägare i teamet du flyttar från och medlem i teamet du flyttar till. Integrationer följer inte med och behöver läggas till igen.",
        },
        {
          type: "p",
          text: "I Search Console finns verifierade och delegerade ägare. Tar du bort dig själv som ägare, ta också bort din verifieringstoken, annars kan du verifiera dig igen enligt [Googles hjälpsida](https://support.google.com/webmasters/answer/7687615). En Google Företagsprofil har en primär ägare, och det ägarskapet [kan överlåtas](https://support.google.com/business/answer/3415281).",
        },
      ],
    },
    {
      id: "checklista",
      heading: "Checklista för själva överlämningen",
      blocks: [
        {
          type: "ol",
          items: [
            "**Samla alla inloggningar i en lösenordshanterare** och dela ett valv eller en post med kunden. Skicka aldrig lösenord i mejl eller sms.",
            "**Byt delade lösenord** till sådana kunden själv väljer, och slå på tvåstegsverifiering där det går.",
            "**Bjud in kunden som redaktör i CMS:et** med kundens egen e-postadress. Ett eget konto gör att historiken visar vem som ändrade vad.",
            "**Skriv en kort \"så här ändrar du\"-guide**: en sida med de 3–5 ändringar kunden gör oftast, med skärmbilder. Tänk på frisörens öppettider eller bilverkstadens prislista, inte hela systemet.",
            "**Testa att kunden själv kan göra en ändring medan du ser på.** Låt hen byta en text, spara och se den på sajten. Fastnar hen är det guiden eller fältet som behöver bli tydligare.",
            "**Kontrollera kontaktformuläret** genom att skicka ett test som hamnar i kundens inkorg.",
            "**Skicka överlämningsmejlet** med en sammanfattning av allt ovan.",
          ],
        },
        {
          type: "tip",
          title: "Har sajten inget CMS?",
          text: "Då blir varje ändring ett ärende till dig. Bygger du i Next.js finns en genomgång av alternativen i [Låt kunden redigera en Next.js-sajt](/guider/lat-kunden-redigera-nextjs).",
        },
      ],
    },
    {
      id: "mejlmall",
      heading: "Mejlmall till kunden",
      blocks: [
        {
          type: "p",
          text: "Anpassa mallen och skicka den samma dag som du går igenom sajten med kunden. Den blir kundens referens längre fram.",
        },
        {
          type: "code",
          lang: "text",
          code: `Ämne: Din nya hemsida är överlämnad – här är allt du behöver

Hej [namn],

Nu är [domän] klar och överlämnad. Här är en sammanfattning.

Det här äger ni:
- Domänen [domän], registrerad på [företag] hos [registrar]
- Hostingkontot hos [leverantör]
- Google Företagsprofil och Search Console (ni är ägare)

Inloggningar:
Jag har delat dem i [lösenordshanterare]. Byt gärna lösenorden
och slå på tvåstegsverifiering.

Så ändrar du innehåll:
Logga in på [CMS-adress]. Guiden "Så här ändrar du" ligger bifogad.
Det du kan ändra själv: texter, bilder, öppettider, priser, nyheter.

Det som är teknik (kontakta mig):
Ny funktion, ny sidtyp, domän eller e-post som slutar fungera.

Support:
[Vad som ingår, hur du når mig och när jag svarar.]

Hör av dig om något är oklart.

Hälsningar,
[ditt namn]`,
        },
      ],
    },
    {
      id: "lar-kunden-uppdatera",
      heading: "Så lär du kunden uppdatera hemsidan på 15 minuter",
      blocks: [
        {
          type: "p",
          text: "En kort genomgång, på plats eller via skärmdelning, slår en lång manual. Låt kunden hålla i musen hela tiden.",
        },
        {
          type: "ol",
          items: [
            "**Logga in** med kundens eget konto, inte ditt.",
            "**Ändra en text** på startsidan, spara och visa resultatet på sajten.",
            "**Byt en bild** och skriv en alt-text. Förklara att alt-texten läses upp för den som inte ser bilden.",
            "**Gör den ändring kunden oftast kommer att göra**, till exempel öppettider, en ny tjänst eller ett nytt inlägg.",
            "**Ångra en ändring**, så att kunden vet att det går att backa.",
            "**Visa var guiden finns** och hur kunden når dig.",
          ],
        },
        {
          type: "p",
          text: "Kunden som vill läsa i lugn och ro efteråt kan få länken till [guiden om att ändra text på hemsidan](/guider/andra-text-pa-hemsidan), som är skriven för icke-tekniker.",
        },
      ],
    },
    {
      id: "support-och-avtal",
      heading: "Support och avtal efter lansering",
      blocks: [
        {
          type: "p",
          text: "Det mesta gnisslet efter lansering kommer av att ingen bestämt var gränsen går. Skriv ner det i avtalet eller i överlämningsmejlet.",
        },
        {
          type: "ul",
          items: [
            "**Kunden gör själv:** texter, bilder, priser, öppettider, nyheter och SEO-titlar i CMS:et.",
            "**Teknik som du gör:** nya funktioner och sidtyper, uppdateringar av beroenden, domän, DNS och e-post, felsökning när något slutat fungera.",
            "**Bestäm formen:** löpande timdebitering, ett fast månatligt avtal eller ingen support alls. Alla tre går, så länge kunden vet vilken som gäller.",
            "**Sätt en svarstid** du kan hålla, och skriv vad som räknas som akut.",
          ],
        },
        {
          type: "p",
          text: "Varför textändringar inte bör hamna hos dig förklaras från kundens perspektiv i [vad en textändring kostar](/guider/vad-kostar-en-textandring).",
        },
        {
          type: "warning",
          title: "Personuppgifter och GDPR",
          text: "Fortsätter du hantera personuppgifter åt kunden efter lansering, till exempel formulärsvar, kundregister eller analysdata, är du sannolikt personuppgiftsbiträde. Då ska behandlingen regleras i ett skriftligt avtal enligt [artikel 28 i dataskyddsförordningen](https://gdpr-text.com/sv/read/article-28). Integritetsskyddsmyndigheten (IMY) har vägledning om vad ett personuppgiftsbiträdesavtal ska innehålla.",
        },
      ],
    },
  ],
  faq: [
    {
      q: "Vem ska äga domänen till en hemsida?",
      a: "Företaget som använder den, alltså kunden. Domänen ska vara registrerad med kunden som innehavare. Du kan ha behörighet att ändra DNS, men den ska inte stå i ditt eller byråns namn.",
    },
    {
      q: "Hur lär jag kunden uppdatera hemsidan?",
      a: "Gör en kort genomgång där kunden själv loggar in och gör de ändringar hen oftast kommer att göra, medan du ser på. Komplettera med en kort skriftlig guide med skärmbilder. Det fungerar bättre än en lång manual.",
    },
    {
      q: "Ska jag ta betalt för support efter lansering?",
      a: "Det är ditt val, men bestäm det innan lansering och skriv ner det. Vanliga upplägg är löpande timdebitering eller ett fast månadsavtal. Det viktiga är att kunden vet vad som ingår och vad som kostar extra.",
    },
    {
      q: "Vad gör jag om kunden råkar ha sönder något?",
      a: "Kontrollera först om ändringen kan ångras i CMS:et eller via versionshistoriken. Gick något sönder i layouten är det ofta ett tecken på att fälten är för fria, så gör dem mer strukturerade. Bestäm i förväg om sådana fel räknas som support.",
    },
  ],
  sources: [
    { title: "Vercel – Transferring a project", url: "https://vercel.com/docs/projects/transferring-projects" },
    { title: "Google Search Console – Managing owners, users, and permissions", url: "https://support.google.com/webmasters/answer/7687615" },
    { title: "Google Företagsprofil – Transfer primary ownership", url: "https://support.google.com/business/answer/3415281" },
    { title: "Dataskyddsförordningen, artikel 28 (svensk text)", url: "https://gdpr-text.com/sv/read/article-28" },
  ],
  related: ["lat-kunden-redigera-nextjs", "vad-kostar-en-textandring", "andra-text-pa-hemsidan"],
  cta: "utvecklare",
};

export default guide;
