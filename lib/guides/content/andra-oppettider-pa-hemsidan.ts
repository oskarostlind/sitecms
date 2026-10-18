import type { Guide } from "../types";

const guide: Guide = {
  slug: "andra-oppettider-pa-hemsidan",
  audience: "smaforetag",
  title: "Ändra öppettider på hemsidan, Google och Facebook",
  h1: "Ändra öppettider på hemsidan, Google och Facebook – och få dem att stämma överallt",
  description:
    "Checklista för att ändra öppettider på hemsidan, Google, Facebook och kartor, hur du skriver avvikande tider och alla röda dagar och aftnar 2026–2027.",
  primaryQuery: "ändra öppettider på hemsidan",
  published: "2026-10-18",
  modified: "2026-10-18",
  intro: [
    "Ändra öppettiderna på hemsidan först, eftersom den är din egen källa, och uppdatera sedan Google Företagsprofil, Facebook, Instagram, kartappar och kataloger samma dag. Avvikande tider för helger läggs in som särskilda öppettider på Google, inte genom att ändra de ordinarie tiderna.",
    "Nedan finns en checklista över alla ställen där tiderna brukar finnas, steg för Google, formatexempel och en tabell över röda dagar och aftnar 2026–2027.",
  ],
  summary: [
    "Ändra på hemsidan först: sidfoten, kontaktsidan och eventuell schema.org-märkning.",
    "Lägg in helgtider som **särskilda öppettider** i Google Företagsprofil, så återgår de ordinarie tiderna av sig själva.",
    "Gå igenom checklistan: Facebook, Instagram, Apple Maps, Bing Places, Eniro, Hitta.se, bokningssystem, skylt och telefonsvarare.",
    "Skriv avvikande tider med veckodag, datum och klockslag: \"Julafton tors 24/12: stängt\".",
    "Lägg in jul- och nyårstider senast i början av december, gärna tidigare.",
  ],
  sections: [
    {
      id: "checklista",
      heading: "Checklista: här finns dina öppettider",
      blocks: [
        {
          type: "p",
          text: "Det vanligaste felet är inte att någon glömmer hemsidan, utan att tiderna ändras på ett ställe och står kvar på fem andra. Bocka av listan varje gång du ändrar något.",
        },
        {
          type: "table",
          head: ["Ställe", "Vad du ändrar", "Kommentar"],
          rows: [
            ["Hemsidan: sidfot", "Ordinarie tider", "Visas på alla sidor, så felet syns överallt."],
            ["Hemsidan: kontaktsidan eller Hitta hit", "Ordinarie och avvikande tider", "Plats för en tydlig ruta med helgtider."],
            ["Hemsidan: schema.org-märkning", "`openingHoursSpecification`", "Bara om sajten har det. Fråga din utvecklare."],
            ["Google Företagsprofil", "Öppettider och särskilda öppettider", "Syns i Sök och Maps. Viktigast efter hemsidan."],
            ["Facebook och Instagram", "Öppettider på sidan och profilen", "Komplettera med ett inlägg vid helger."],
            ["Apple Maps", "Via Apple Business Connect", "Har stöd för tillfälliga specialtider."],
            ["Bing Places", "Öppettider och tider för särskilda dagar", "Kan importera uppgifter från Google Företagsprofil."],
            ["Eniro och Hitta.se", "Företagsuppgifter", "Kolla hur ni visas och uppdatera där det går."],
            ["Bokningssystem", "Schema och stängda dagar", "Annars kan kunder boka tider när du har stängt."],
            ["Skylt, dörr och telefonsvarare", "Lapp och röstmeddelande", "Lätt att glömma och det första stamkunderna ser."],
          ],
        },
        {
          type: "p",
          text: "Ändrar du andra uppgifter samtidigt, till exempel priser eller texten på kontaktsidan, se [uppdatera priser på hemsidan](/guider/uppdatera-priser-pa-hemsidan) och [ändra text på hemsidan](/guider/andra-text-pa-hemsidan).",
        },
      ],
    },
    {
      id: "pa-hemsidan",
      heading: "Ändra öppettiderna på hemsidan",
      blocks: [
        {
          type: "p",
          text: "I WordPress ligger tiderna oftast i ett sidfotswidget- eller mallområde (**Utseende** eller **Redigera webbplats**) och på kontaktsidan. I Wix, Squarespace och One.com-byggaren klickar du på textrutan i sidfoten och skriver om, och publicerar sedan. På en byråbyggd sajt kan tiderna vara inlagda i koden, och då behöver du antingen ett CMS-fält eller hjälp från byrån.",
        },
        {
          type: "p",
          text: "Har sajten schema.org-märkning för företaget kan Google läsa tiderna maskinellt. Google beskriver hur avvikande dagar anges med `validFrom` och `validThrough`, och att en stängd dag markeras med `opens` och `closes` satta till `00:00`:",
        },
        {
          type: "code",
          lang: "json",
          code: `"openingHoursSpecification": [
  {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    "opens": "09:00",
    "closes": "17:00"
  },
  {
    "@type": "OpeningHoursSpecification",
    "opens": "00:00",
    "closes": "00:00",
    "validFrom": "2026-12-24",
    "validThrough": "2026-12-26"
  }
]`,
        },
        {
          type: "p",
          text: "Är sajten byggd i Next.js kan utvecklaren lägga öppettiderna i ett eget fält i ett CMS som sitecms, så att du ändrar dem själv och ser ändringen på sajten inom sekunder. Mer om det i [hemsida byggd i Next.js](/guider/andra-hemsida-byggd-i-nextjs).",
        },
      ],
    },
    {
      id: "google-sarskilda-oppettider",
      heading: "Särskilda öppettider i Google Företagsprofil",
      blocks: [
        {
          type: "ol",
          items: [
            "Logga in på kontot som förvaltar profilen och sök upp ditt företag på Google, eller gå via Google Företagsprofil.",
            "Välj **Redigera profil** och sedan **Öppettider**.",
            "Klicka på pennan vid **Särskilda öppettider**.",
            "Bekräfta en föreslagen helgdag med **Granska**, eller välj **Lägg till ett datum**.",
            "Bocka i **Stängt** om du har stängt hela dagen. Har du öppet: avmarkera **Stängt** och skriv in tiderna.",
            "Klicka på **Spara**.",
          ],
        },
        {
          type: "ul",
          items: [
            "Särskilda öppettider ersätter de ordinarie för just det datumet. Därefter gäller de ordinarie igen.",
            "De ordinarie öppettiderna måste vara ifyllda för att de särskilda ska visas.",
            "Google rekommenderar att du lägger in helgdagar även när tiderna är desamma som vanligt.",
            "Särskilda öppettider är till för upp till sex dagar i rad. Har du stängt sju dagar eller mer rekommenderar Google att du markerar företaget som tillfälligt stängt.",
          ],
        },
      ],
    },
    {
      id: "skriv-tydligt",
      heading: "Så skriver du avvikande öppettider tydligt",
      blocks: [
        {
          type: "p",
          text: "Skriv veckodag och datum tillsammans, använd 24-timmarsformat och skriv ut \"stängt\". Undvik \"som vanligt\" och \"ordinarie tider gäller\" utan att säga vilka tiderna är.",
        },
        {
          type: "table",
          caption: "Formatexempel",
          head: ["Otydligt", "Tydligt"],
          rows: [
            ["Stängt i jul", "Tors 24/12–lör 26/12: stängt"],
            ["Kortare dagar runt nyår", "Ons 30/12: 10–14 · Tors 31/12: stängt · Fre 1/1: stängt"],
            ["Annorlunda tider i påsk", "Fre 3/4–mån 6/4: stängt. Från tis 7/4: ordinarie tider (mån–fre 9–17)"],
            ["Sommaröppet", "29/6–9/8: mån–fre 10–15, lör–sön stängt"],
          ],
        },
        {
          type: "p",
          text: "Ett café kan skriva \"Midsommarafton fre 19/6: 8–13\", en bilverkstad \"Stängt v. 52, akut däckbyte: ring 070-…\". Är det många avvikelser, lägg en ruta överst på kontaktsidan och en kort nyhet, se [lägga upp nyheter på hemsidan](/guider/lagga-upp-nyheter-pa-hemsidan).",
        },
      ],
    },
    {
      id: "roda-dagar-2026-2027",
      heading: "Röda dagar och aftnar 2026–2027",
      blocks: [
        {
          type: "p",
          text: "Påsk, Kristi himmelsfärdsdag, pingst och midsommar flyttar sig varje år. Midsommardagen är enligt lagen om allmänna helgdagar lördagen mellan 20 och 26 juni, och alla helgons dag lördagen mellan 31 oktober och 6 november. Aftnarna är inte allmänna helgdagar, men många har stängt eller kortare tider då.",
        },
        {
          type: "table",
          caption: "Datum kontrollerade mot svenska källor, se listan nedan.",
          head: ["Dag", "2026", "2027", "Typ"],
          rows: [
            ["Nyårsdagen", "tors 1 jan", "fre 1 jan", "Röd dag"],
            ["Trettondedag jul", "tis 6 jan", "ons 6 jan", "Röd dag"],
            ["Långfredagen", "fre 3 apr", "fre 26 mar", "Röd dag"],
            ["Påskafton", "lör 4 apr", "lör 27 mar", "Afton"],
            ["Påskdagen", "sön 5 apr", "sön 28 mar", "Röd dag"],
            ["Annandag påsk", "mån 6 apr", "mån 29 mar", "Röd dag"],
            ["Första maj", "fre 1 maj", "lör 1 maj", "Röd dag"],
            ["Kristi himmelsfärdsdag", "tors 14 maj", "tors 6 maj", "Röd dag"],
            ["Pingstdagen", "sön 24 maj", "sön 16 maj", "Röd dag"],
            ["Nationaldagen", "lör 6 jun", "sön 6 jun", "Röd dag"],
            ["Midsommarafton", "fre 19 jun", "fre 25 jun", "Afton"],
            ["Midsommardagen", "lör 20 jun", "lör 26 jun", "Röd dag"],
            ["Alla helgons dag", "lör 31 okt", "lör 6 nov", "Röd dag"],
            ["Julafton", "tors 24 dec", "fre 24 dec", "Afton"],
            ["Juldagen", "fre 25 dec", "lör 25 dec", "Röd dag"],
            ["Annandag jul", "lör 26 dec", "sön 26 dec", "Röd dag"],
            ["Nyårsafton", "tors 31 dec", "fre 31 dec", "Afton"],
          ],
        },
        {
          type: "tip",
          title: "Lägg in julen i god tid",
          text: "Många kunder söker öppettider veckorna före jul. Lägg in alla avvikande dagar för jul och nyår på en gång, gärna i november, och gör en sista kontroll i Google Maps och på mobilen veckan före julafton.",
        },
      ],
    },
  ],
  faq: [
    {
      q: "Varför visar Google fel öppettider för mitt företag?",
      a: "Google kan uppdatera en profil utifrån användarnas förslag och andra källor, bland annat din hemsida. Gamla tider på hemsidan eller i kataloger kan alltså smitta Google. Logga in, rätta tiderna, granska föreslagna ändringar och se till att hemsidan säger samma sak.",
    },
    {
      q: "Hur visar jag avvikande öppettider på Google?",
      a: "Använd särskilda öppettider i Google Företagsprofil: Redigera profil, Öppettider, Särskilda öppettider. Välj datum, ange tider eller Stängt och spara. De ordinarie tiderna gäller igen dagen efter.",
    },
    {
      q: "Hur skriver jag öppettider för röda dagar på hemsidan?",
      a: "Skriv dagens namn, veckodag, datum och tid, till exempel \"Långfredag fre 3/4: stängt\". Lista alla avvikande dagar för en helg i samma ruta och skriv när de ordinarie tiderna gäller igen.",
    },
    {
      q: "Hur långt i förväg ska jag lägga in julöppettider?",
      a: "Så snart du vet dem, gärna i november. Kunder planerar inför jul och söker tidigt. Lägg in dem på hemsidan och i Google samma dag så att uppgifterna inte krockar.",
    },
    {
      q: "Är julafton och midsommarafton röda dagar?",
      a: "Nej, de är inte allmänna helgdagar enligt lag. Många företag har ändå stängt eller kortare tider, så skriv alltid ut vad som gäller hos dig.",
    },
  ],
  sources: [
    {
      title: "Lag (1989:253) om allmänna helgdagar",
      url: "https://data.riksdagen.se/dokument/sfs-1989-253.html",
    },
    {
      title: "EFN: Röda dagar 2026 (datum inkl. midsommarafton, julafton, nyårsafton)",
      url: "https://efn.se/roda-dagar-2026-sa-maxar-du-ledigheten",
    },
    {
      title: "Företagarna: Röda dagar (2027 inkl. påskafton, midsommarafton, julafton, nyårsafton)",
      url: "https://www.foretagarna.se/driva-eget-foretag/ekonomi/roda-dagar/",
    },
    {
      title: "Øresunddirekt: Holidays 2027 in Denmark and Sweden",
      url: "https://oresunddirekt.dk/en/working-in-sweden/vacation-and-public-holidays/holidays-2027-in-denmark-and-sweden/",
    },
    { title: "Google: Ange särskilda öppettider", url: "https://support.google.com/business/answer/6303076" },
    {
      title: "Google: Om Google-uppdateringar i din företagsprofil",
      url: "https://support.google.com/business/answer/3480441?hl=En",
    },
    {
      title: "Google Search Central: Strukturerad data för lokala företag (LocalBusiness)",
      url: "https://developers.google.com/structured-data/local-businesses/",
    },
    {
      title: "Apple: Configure location attributes in Apple Business Connect",
      url: "https://support.apple.com/guide/apple-business-connect/abcbdc543423/web",
    },
    {
      title: "Search Engine Journal: Microsoft launches new Bing Places for Business",
      url: "https://www.searchenginejournal.com/microsoft-launches-new-bing-places-for-business/557520/",
    },
    {
      title: "How to change business opening hours on Google, Yelp, Facebook & Bing",
      url: "https://localpage.uk/blog/how-to-change-business-opening-hours-on-google-yelp-facebook-bing",
    },
  ],
  related: ["uppdatera-priser-pa-hemsidan", "andra-text-pa-hemsidan", "lagga-upp-nyheter-pa-hemsidan"],
  cta: "kund",
};

export default guide;
