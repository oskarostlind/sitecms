import type { Guide } from "../types";

const guide: Guide = {
  slug: "andra-text-pa-hemsidan",
  audience: "smaforetag",
  title: "Ändra text på hemsidan själv – steg för steg",
  h1: "Så ändrar du text på hemsidan själv – även om någon annan byggt den",
  description:
    "Ta reda på vilket system hemsidan är byggd i, skaffa rätt inloggning och ändra texten säkert i WordPress, Wix, Squarespace, One.com eller Strato.",
  primaryQuery: "ändra text på hemsidan själv",
  published: "2026-10-18",
  modified: "2026-10-18",
  intro: [
    "Du kan ändra text på hemsidan själv om du vet vilket system den är byggd i och har en inloggning med rätt behörighet. I WordPress, Wix, Squarespace och hemsidebyggare som One.com och Strato klickar du direkt i texten och sparar.",
    "Är sajten byggd från grunden av en byrå eller utvecklare finns det ofta ingen inloggning alls. Då sitter texterna i koden och du behöver antingen be utvecklaren eller få ett redigeringsverktyg kopplat till sajten.",
  ],
  summary: [
    "Ta först reda på systemet: fråga den som byggde sajten, titta i sidfoten eller använd ett verktyg som Wappalyzer.",
    "Logga in där systemet bor (till exempel `/wp-admin` för WordPress, wix.com för Wix) och öppna sidan i redigeringsläget.",
    "Kopiera den gamla texten innan du ändrar, gör en ändring i taget och förhandsgranska före publicering.",
    "Har du ingen inloggning: be den som byggde sajten om ett eget konto i ditt namn, inte deras.",
  ],
  sections: [
    {
      id: "vilket-system",
      heading: "Steg 1: Ta reda på vilket system sajten är byggd i",
      blocks: [
        {
          type: "p",
          text: "Allt annat hänger på det här. Hur du loggar in, var knapparna sitter och vad som går att ändra skiljer sig helt mellan systemen. Börja med det enklaste och gå vidare nedåt i listan tills du har ett svar.",
        },
        {
          type: "ol",
          items: [
            "**Fråga eller leta i papperen.** Fakturor, offerter och välkomstmejl från den som byggde sajten nämner nästan alltid systemet. Sök i inkorgen på \"WordPress\", \"Wix\", \"Squarespace\", \"one.com\" eller \"Strato\".",
            "**Titta i sidfoten.** Många sajter har en rad längst ner som \"Skapad med Wix\" eller \"Drivs med WordPress\". Den kan vara borttagen, så frånvaro bevisar ingenting.",
            "**Testa adressen.** Lägg till `/wp-admin` efter din domän, till exempel `dinfirma.se/wp-admin`. Får du en WordPress-inloggning är saken klar.",
            "**Visa sidkällan.** Högerklicka på sidan och välj Visa sidkälla (Ctrl+U i Chrome, Edge och Firefox på Windows). Sök sedan med Ctrl+F efter ledtrådarna i tabellen nedan.",
            "**Använd ett verktyg.** Webbläsartillägget [Wappalyzer](https://www.wappalyzer.com/) visar gratis vilka tekniker en sajt använder. Tjänsten BuiltWith gör samma sak när du klistrar in adressen.",
          ],
        },
        {
          type: "table",
          caption: "Ledtrådar i sidkällan",
          head: ["Sök efter", "Betyder oftast"],
          rows: [
            ["`wp-content` eller `generator` med \"WordPress\"", "WordPress"],
            ["`wixstatic` eller \"Wix.com Website Builder\"", "Wix"],
            ["`_next/static` eller `__NEXT_DATA__`", "Next.js (egenutvecklad sajt)"],
            ["Inget av ovanstående", "Kör Wappalyzer eller fråga den som byggde sajten"],
          ],
        },
      ],
    },
    {
      id: "andra-per-system",
      heading: "Steg 2: Ändra texten i ditt system",
      blocks: [
        { type: "h3", text: "WordPress" },
        {
          type: "ol",
          items: [
            "Gå till `dinfirma.se/wp-admin` och logga in.",
            "Välj **Sidor** i menyn till vänster, håll muspekaren över sidan och klicka **Redigera**.",
            "Klicka i texten och skriv. Använd **Visa** och **Förhandsgranska i ny flik** för att se resultatet.",
            "Klicka **Spara** uppe till höger (i äldre versioner heter knappen Uppdatera).",
          ],
        },
        {
          type: "p",
          text: "Ligger texten i sidhuvudet eller sidfoten sitter den ofta i temat, inte på en sida. Då är det säkrare att fråga den som byggde sajten.",
        },
        { type: "h3", text: "Wix" },
        {
          type: "p",
          text: "Logga in på wix.com med kontot som äger sajten, öppna sajtens översikt och klicka **Edit Site** (så heter knappen i den engelska versionen). Klicka i texten och ändra. Tänk på att **Save** bara sparar i editorn. Besökarna ser ändringen först när du klickar **Publish**.",
        },
        { type: "h3", text: "Squarespace" },
        {
          type: "p",
          text: "Logga in via account.squarespace.com och öppna sajten. Gå till sidan, klicka **Edit**, klicka i textblocket och spara. Squarespace låter bara ägare och medarbetare med rätt behörighet skriva i textblock. Rollen Website editor räcker för att ändra befintliga sidor.",
        },
        { type: "h3", text: "One.com och Strato" },
        {
          type: "p",
          text: "Hos One.com loggar du in på websitebuilder.one.com (eller kontrollpanelen på login.one.com) och klickar **Edit site**. Hos Strato loggar du in i kundinloggningen med kundnummer och lösenord, klickar på den blå **Start**-knappen vid paketet och öppnar Sitebuilder. I båda klickar du sedan i texten, ändrar och publicerar.",
        },
        { type: "h3", text: "Byråbyggd eller egenutvecklad sajt" },
        {
          type: "p",
          text: "Om sidkällan pekar på Next.js eller React och ingen kan ge dig en inloggning ligger texterna sannolikt direkt i koden. Då kan du inte ändra själv förrän ett redigeringsverktyg kopplas in. Vi går igenom alternativen i [guiden om hemsidor byggda i Next.js](/guider/andra-hemsida-byggd-i-nextjs).",
        },
      ],
    },
    {
      id: "inloggningar",
      heading: "Vilka inloggningar du behöver och vem som brukar ha dem",
      blocks: [
        {
          type: "p",
          text: "Det vanligaste hindret är inte tekniken utan att inloggningen ligger hos fel person. Kontona är personliga, så be om ett eget konto i stället för att låna någon annans.",
        },
        {
          type: "table",
          head: ["System", "Du behöver", "Ligger ofta hos"],
          rows: [
            ["WordPress", "Eget konto med rollen Redaktör eller Administratör", "Byrån eller den som byggde sajten"],
            ["Wix", "Wix-kontot som äger sajten, eller en inbjudan som medarbetare", "Den som skapade sajten"],
            ["Squarespace", "Inbjudan som medarbetare med rollen Website editor eller Administrator", "Sajtens ägare"],
            ["One.com, Strato", "Kundinloggning till webbhotellet", "Den som tecknade abonnemanget"],
            ["Egenutvecklad", "Ofta finns ingen, ändringar görs i koden", "Utvecklaren"],
          ],
        },
        {
          type: "tip",
          title: "Ägarskap",
          text: "Se till att företaget självt äger kontot och domänen. Om en tidigare anställd eller byrå står som ägare blir varje ändring beroende av att någon svarar på mejl.",
        },
      ],
    },
    {
      id: "forstor-inget",
      heading: "Så undviker du att förstöra något",
      blocks: [
        {
          type: "p",
          text: "Att ändra en text är en av de säkraste sakerna du kan göra på en hemsida. Riskerna ligger i att råka ändra fel sak eller publicera ett halvfärdigt resultat. Några vanor tar bort nästan alla problem.",
        },
        {
          type: "ul",
          items: [
            "**Spara den gamla texten** i ett dokument innan du börjar. Då kan du alltid klistra tillbaka den.",
            "**En ändring i taget.** Byt öppettider, spara, kontrollera. Ändra sedan nästa sak.",
            "**Förhandsgranska**, både på datorn och i mobilen, innan du publicerar.",
            "**Rör bara texten.** Låt tema, tillägg, inställningar och kod vara.",
            "**Lär dig ångra-funktionen.** WordPress sparar revisioner som du kan återställa, och Wix har Site History där du kan gå tillbaka till en tidigare version.",
          ],
        },
        {
          type: "warning",
          text: "Får du en fråga om att uppdatera tema, tillägg eller WordPress-versionen medan du ändrar text, avstå och hör med den som sköter sajten. Sådana uppdateringar kan påverka hela sajten.",
        },
        {
          type: "p",
          text: "Samma vanor gäller när du [byter en bild](/guider/byta-bild-pa-hemsidan) eller [uppdaterar priser](/guider/uppdatera-priser-pa-hemsidan).",
        },
      ],
    },
    {
      id: "gor-sjalv-eller-byra",
      heading: "Gör själv, be byrån eller byt lösning?",
      blocks: [
        {
          type: "table",
          caption: "Beslutstabell",
          head: ["Situation", "Gör så här"],
          rows: [
            ["Du har inloggning och vill ändra text på en befintlig sida", "**Gör själv**"],
            ["Ny sida, ny meny eller ändrad layout", "**Be byrån**, eller gör själv om du är van vid systemet"],
            ["Texten sitter i sidhuvud, sidfot eller ett formulär", "**Be byrån** om du inte hittar den på en vanlig sida"],
            ["Sajten är egenutvecklad och saknar inloggning", "**Be byrån** per ändring, eller låt dem koppla in ett redigeringsverktyg"],
            ["Du betalar för många småändringar varje månad", "**Byt lösning** till något du kan redigera själv"],
          ],
        },
        {
          type: "p",
          text: "Ett exempel: en frisör som byter öppettider inför sommaren gör det själv på fem minuter i Wix. En redovisningsbyrå med egenutvecklad sajt som vill uppdatera tjänstebeskrivningar varje kvartal tjänar mer på ett redigeringsverktyg. Vad varje ändring kostar via byrå går vi igenom i [guiden om vad en textändring kostar](/guider/vad-kostar-en-textandring).",
        },
      ],
    },
  ],
  faq: [
    {
      q: "Hur ser jag vilket system min hemsida är byggd i?",
      a: "Lägg till /wp-admin efter domänen för att testa WordPress, och sök i sidkällan (Ctrl+U) efter ord som wp-content eller wixstatic. Enklast är webbläsartillägget Wappalyzer, som visar systemet med ett klick. Du kan också leta i fakturor från den som byggde sajten.",
    },
    {
      q: "Kan jag ändra själv om webbyrån byggt sajten?",
      a: "Ja, om byrån byggt den i WordPress eller en hemsidebyggare och ger dig ett eget konto. Har de byggt sajten från grunden i kod finns oftast ingen inloggning, och då behöver de antingen göra ändringen eller koppla in ett redigeringsverktyg.",
    },
    {
      q: "Kan jag förstöra något när jag ändrar text?",
      a: "Det är ovanligt om du bara ändrar text och låter tema, tillägg och inställningar vara. Spara den gamla texten, förhandsgranska innan du publicerar och lär dig var ångra-funktionen finns. I WordPress och Wix kan du återställa tidigare versioner.",
    },
    {
      q: "Vad gör jag om jag inte har någon inloggning?",
      a: "Kontakta den som byggde sajten och be om ett eget konto i ditt namn. Är ägarkontot registrerat på en tidigare anställd, be om att få det överfört till en adress företaget äger. Finns det ingen inloggning alls är sajten troligen egenutvecklad.",
    },
    {
      q: "Varför syns inte min ändring på hemsidan?",
      a: "I Wix och flera andra byggare måste du publicera, inte bara spara. Det kan också bero på att webbläsaren visar en sparad kopia, så ladda om sidan eller öppna den i ett privat fönster.",
    },
  ],
  sources: [
    { title: "Wix Help Center: Accessing Your Editor", url: "https://support.wix.com/en/article/accessing-your-editor" },
    { title: "Wix Help Center: Viewing and Managing Your Site History", url: "https://support.wix.com/en/article/viewing-and-managing-your-site-history" },
    { title: "Learn WordPress: Dashboard Overview", url: "https://learn.wordpress.org/lesson-plan/dashboard-overview/" },
    { title: "WordPress.org: How to use the View feature", url: "https://wordpress.org/documentation/article/how-to-use-the-preview-function/" },
    { title: "WordPress.org: Roles and Capabilities", url: "https://wordpress.org/documentation/article/roles-and-capabilities/" },
    { title: "InMotion Hosting: Restore a previous version of a page or post", url: "https://www.inmotionhosting.com/support/edu/wordpress/how-to-restore-a-previous-version-of-a-page-or-post" },
    { title: "Squarespace Help: Text blocks", url: "https://support.squarespace.com/hc/en-us/articles/205813798-Text-blocks" },
    { title: "Squarespace Help: Fix site editing issues", url: "https://support.squarespace.com/hc/en-us/articles/228363808-Fix-site-editing-issues" },
    { title: "Squarespace Help: Contributor roles and permissions", url: "https://support.squarespace.com/hc/en-us/articles/206537297-Squarespace-permissions-explained" },
    { title: "one.com Help: How do I log in to the one.com Website Builder?", url: "https://help.one.com/hc/en-us/articles/13232268823441-How-do-I-log-in-to-the-one-com-Website-Builder" },
    { title: "STRATO: How do I log in to my Website Builder package?", url: "https://www.strato-hosting.co.uk/faq/site-builder/how-do-i-log-in-to-my-website-builder-pro-package/" },
    { title: "STRATO: Sitebuilder", url: "https://www.strato.se/sitebuilder/" },
    { title: "Elegant Themes: How to Tell if a Website is Made With WordPress", url: "https://elegantthemes.com/blog/resources/how-to-tell-if-a-website-is-made-with-wordpress" },
    { title: "Wappalyzer: Frequently asked questions (extension)", url: "https://www.wappalyzer.com/faq/extension/" },
    { title: "Next.js docs: assetPrefix (/_next/static)", url: "https://nextjs.org/docs/app/api-reference/config/next-config-js/assetPrefix" },
  ],
  related: ["andra-hemsida-byggd-i-nextjs", "byta-bild-pa-hemsidan", "vad-kostar-en-textandring", "uppdatera-priser-pa-hemsidan"],
  cta: "kund",
};

export default guide;
