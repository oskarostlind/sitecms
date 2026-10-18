import type { Guide } from "../types";

const guide: Guide = {
  slug: "vad-kostar-en-textandring",
  audience: "smaforetag",
  title: "Vad kostar en textändring hos webbyrån?",
  h1: "Vad kostar det när webbyrån ändrar en text? Timpris, minimidebitering och alternativ",
  description:
    "Vad kostar en liten ändring på hemsidan hos en webbyrå? Så fungerar timpris och debitering per påbörjad tid, verkliga prisexempel och sätt att slippa betala.",
  primaryQuery: "kostnad ändra text på hemsida webbyrå",
  published: "2026-10-18",
  modified: "2026-10-18",
  intro: [
    "En liten textändring hos en webbyrå kostar i praktiken det byrån tar för den minsta tidsenhet de debiterar, inte de minuter jobbet faktiskt tar. Debiterar byrån per påbörjad timme betalar du en hel timme även för en ändring på fem minuter.",
    "Det är därför samma ändring kan kosta mycket olika hos olika byråer, trots att timpriset är ungefär detsamma. Här går vi igenom hur det fungerar, vad några byråer faktiskt publicerar och hur du kan slippa betala för småjobb.",
  ],
  summary: [
    "Fråga alltid hur byrån **avrundar tiden**: per minut, kvart, halvtimme eller påbörjad timme. Det avgör priset på småändringar mer än timpriset.",
    "Få byråer publicerar sina priser. De fyra vi hittade anger timpriser på 995–1 190 kr exkl. moms.",
    "Ett serviceavtal lönar sig om du gör ändringar regelbundet eller behöver teknisk skötsel. Gör du bara ett par ändringar om året blir det ofta dyrare.",
    "Billigast är att kunna göra ändringarna själv, antingen i systemet du redan har eller genom att utvecklaren kopplar ett CMS.",
  ],
  sections: [
    {
      id: "sa-debiteras-andringar",
      heading: "Så debiterar webbyråer små ändringar",
      blocks: [
        {
          type: "p",
          text: "De flesta byråer tar betalt för ändringar på löpande räkning, alltså tid gånger timpris. Men det finns tre saker som gör att fakturan för en liten ändring kan bli högre än du väntar dig:",
        },
        {
          type: "ul",
          items: [
            "**Avrundning av tid.** Tiden räknas ofta per påbörjad kvart, halvtimme eller timme. En ändring på tio minuter blir då en kvart, en halvtimme eller en hel timme på fakturan.",
            "**Minsta debitering.** Vissa byråer har en lägsta summa per ärende, oavsett hur lite tid det tar.",
            "**Startavgift eller ärendeavgift.** Ibland tillkommer en fast avgift för att öppna ett ärende eller för att sätta sig in i en sajt som byrån inte byggt själv.",
          ],
        },
        {
          type: "p",
          text: "Det finns också byråer som går åt andra hållet och debiterar per arbetad minut. Ingen modell är fel i sig, men du behöver veta vilken som gäller innan du skickar in ärendet.",
        },
      ],
    },
    {
      id: "publicerade-priser",
      heading: "Vad tar byråerna? Publicerade priser",
      blocks: [
        {
          type: "p",
          text: "De flesta svenska webbyråer publicerar inga priser för ändringar, och svaret blir ofta ”kontakta oss”. Tabellen visar vad fyra byråer anger på sina egna sidor. Fyra byråer räcker inte för att säga vad som är ”normalt” på marknaden, men de ger en känsla för nivån och visar hur olika debiteringen kan se ut.",
        },
        {
          type: "table",
          caption: "Offentliga prisuppgifter hämtade oktober 2026. Priser ändras – kontrollera hos respektive byrå.",
          head: ["Byrå", "Vad som anges", "Belopp enligt byrån"],
          rows: [
            ["EMS Design", "Löpande arbete, t.ex. uppdateringar (debiteras per påbörjad halvtimme)", "995 kr exkl. moms per timme"],
            ["EMS Design", "Serviceavtal MINI / BAS / PRO (PRO inkl. en fri arbetstimme per månad, löper årsvis)", "495 / 695 / 1 495 kr/mån exkl. moms"],
            ["Grafix Studio", "Ändringar utan avtal", "1 190 kr/h exkl. moms"],
            ["Grafix Studio", "Supportavtal Basic / Premium / Business WP (1 / 2 / 3 timmar webbjobb per månad, 6 månaders bindningstid)", "1 990 / 2 990 / 4 490 kr/mån exkl. moms"],
            ["Webby Design", "Byte av bilder och texter", "995 kr exkl. moms per påbörjad timme"],
            ["Webby Design", "Ändring av öppettider", "250 kr exkl. moms, engångskostnad"],
            ["Webby Design", "Serviceavtal ”Komplett inkl. fria ändringar”", "2 995 kr exkl. moms per år"],
            ["Punktgruppen", "Felsökning, ändringar och utveckling i WordPress", "995 kr/tim exkl. moms, debiteras per minut"],
            ["Punktgruppen", "TryggWebb, löpande webbhantering (support debiteras separat)", "599 kr/mån exkl. moms"],
          ],
        },
        {
          type: "p",
          text: "Som jämförelse anger Webbi i sin prisguide att innehållsuppdateringar hos en byrå vanligtvis kostar 800–1 500 kr i timmen. Det är en uppskattning av marknaden, inte en prislista.",
        },
      ],
    },
    {
      id: "rakneexempel",
      heading: "Räkneexempel: en ändring på tio minuter",
      blocks: [
        {
          type: "p",
          text: "**Räkneexempel.** Säg att du vill byta en mening på startsidan och att jobbet tar tio minuter. Så här blir priset beroende på hur tiden avrundas (alla belopp exkl. moms):",
        },
        {
          type: "table",
          head: ["Debitering", "Underlag", "Kostnad för tio minuter"],
          rows: [
            ["Per påbörjad timme", "995 kr/tim (Webby Design)", "995 kr"],
            ["Per påbörjad halvtimme", "995 kr/tim (EMS Design)", "497,50 kr"],
            ["Per påbörjad kvart", "Hypotetiskt timpris 1 000 kr", "250 kr"],
            ["Per minut", "995 kr/tim (Punktgruppen)", "165,83 kr enligt byråns eget exempel"],
          ],
        },
        {
          type: "p",
          text: "Samma ändring kan alltså kosta sex gånger mer hos en byrå än hos en annan, trots nästan samma timpris. Skickar du tio sådana ändringar i tio separata mejl under ett år blir skillnaden tydlig.",
        },
        {
          type: "tip",
          title: "Fråga detta innan du beställer",
          text: "”Hur avrundar ni tiden, finns det en minsta debitering, och tillkommer någon avgift per ärende?” Tre frågor som tar en minut att ställa.",
        },
      ],
    },
    {
      id: "serviceavtal",
      heading: "När lönar sig ett serviceavtal?",
      blocks: [
        {
          type: "p",
          text: "Ett serviceavtal (kallas också supportavtal eller förvaltningsavtal) är en fast månads- eller årskostnad. Vad som ingår skiljer sig mycket. Ibland är det bara teknisk skötsel som uppdateringar och backup, ibland ingår ett visst antal timmar eller ”fria ändringar”.",
        },
        {
          type: "p",
          text: "Ett avtal brukar löna sig när:",
        },
        {
          type: "ul",
          items: [
            "Du gör ändringar flera gånger i månaden och avtalet faktiskt inkluderar ändringstid.",
            "Sajten kräver teknisk skötsel som du inte kan göra själv, till exempel uppdateringar av WordPress och tillägg.",
            "Du behöver snabb hjälp när något går sönder och avtalet ger förtur.",
          ],
        },
        {
          type: "p",
          text: "Det lönar sig sällan när:",
        },
        {
          type: "ul",
          items: [
            "Du bara ändrar något ett par gånger om året. Då är det ofta billigare att betala per ärende.",
            "Avtalet bara täcker teknik och ändringar ändå debiteras separat. Då betalar du för båda.",
            "Bindningstiden är lång och du inte vet om du vill ha kvar byrån.",
          ],
        },
        {
          type: "p",
          text: "Räkna enkelt: ta avtalets årskostnad och dela med byråns timpris för ändringar. Det ger antalet timmar ändringar per år du behöver för att avtalet ska gå jämnt ut, om ändringstid ingår.",
        },
      ],
    },
    {
      id: "slippa-betala",
      heading: "Tre sätt att slippa betala för småändringar",
      blocks: [
        { type: "h3", text: "1. Gör ändringen själv i systemet du redan har" },
        {
          type: "p",
          text: "Är sajten byggd i WordPress, Wix, Squarespace eller en liknande byggare kan du nästan alltid ändra texter själv. Be byrån om ett eget inloggningskonto som redaktör. Stegen finns i [ändra text på hemsidan](/guider/andra-text-pa-hemsidan) och för priser i [uppdatera priser på hemsidan](/guider/uppdatera-priser-pa-hemsidan).",
        },
        { type: "h3", text: "2. Låt utvecklaren koppla ett CMS" },
        {
          type: "p",
          text: "Är sajten kodad från grunden, till exempel i Next.js eller React, finns det ofta inget ställe där du kan logga in. Då kan utvecklaren koppla ett CMS så att texter, bilder och priser blir redigerbara fält. Det är en engångsinsats som gör att framtida ändringar blir gratis. För Next.js-sajter är sitecms ett sådant alternativ. Läs mer i [ändra en hemsida byggd i Next.js](/guider/andra-hemsida-byggd-i-nextjs).",
        },
        { type: "h3", text: "3. Samla ändringarna till en beställning" },
        {
          type: "p",
          text: "Om du måste gå via byrån: skriv ner ändringarna i ett dokument under en period och skicka allt på en gång. Ange exakt sida, gammal text och ny text. Då hamnar flera ändringar inom samma påbörjade tidsenhet i stället för att var och en avrundas uppåt.",
        },
      ],
    },
  ],
  faq: [
    {
      q: "Vad är normalt timpris för en webbyrå?",
      a: "Det går inte att säga exakt eftersom få byråer publicerar priser. De fyra prislistor vi hittade anger 995–1 190 kr i timmen exkl. moms, och Webbis prisguide uppskattar 800–1 500 kr i timmen för innehållsuppdateringar. Be alltid om priset skriftligt.",
    },
    {
      q: "Debiteras man per påbörjad timme för ändringar på hemsidan?",
      a: "Det beror på byrån. Vissa debiterar per påbörjad timme, andra per halvtimme, kvart eller till och med per minut. Fråga innan du beställer, eftersom avrundningen ofta påverkar priset för små ändringar mer än själva timpriset.",
    },
    {
      q: "Lönar sig ett serviceavtal för hemsidan?",
      a: "Ja, om du gör ändringar ofta och avtalet inkluderar ändringstid, eller om sajten behöver teknisk skötsel du inte klarar själv. Gör du bara ett par ändringar om året är det ofta billigare att betala per gång.",
    },
    {
      q: "Kan jag göra ändringarna på hemsidan själv?",
      a: "I WordPress, Wix, Squarespace och liknande system nästan alltid, om du har ett konto. Är sajten specialbyggd i kod krävs att utvecklaren kopplar ett CMS först. Därefter kan du ändra texter och bilder utan att betala per ändring.",
    },
    {
      q: "Vad kostar det att ändra öppettider på hemsidan?",
      a: "Om du gör det själv kostar det ingenting. Hos en byrå beror det på hur de debiterar. En av byråerna i vår genomgång anger ett fast pris på 250 kr exkl. moms för att ändra öppettider.",
    },
  ],
  sources: [
    { title: "EMS Design: Priser", url: "https://www.emsdesign.se/priser" },
    { title: "EMS Design: Avtalsvillkor", url: "https://emsdesign.se/avtalsvillkor/" },
    { title: "EMS Design: Serviceavtal för hemsidor", url: "https://emsdesign.se/tjanster/serviceavtal-hemsidor/" },
    { title: "Grafix Studio: Supportavtal WordPress", url: "https://grafixstudio.se/tjanster/supportavtal-wordpress/" },
    { title: "Grafix Studio: Vad kostar en hemsida 2026?", url: "https://grafixstudio.se/blogg/vad-kostar-en-hemsida/" },
    { title: "Webby Design: Priser hemsida", url: "https://webbydesign.se/priser" },
    { title: "Punktgruppen: WordPress-hjälp för företag", url: "https://www.punktgruppen.se/wordpress/" },
    {
      title: "Webbi: Vad kostar en hemsida 2026? Komplett guide för svenska företag",
      url: "https://webbi.se/blogg/vad-kostar-en-hemsida-2026-komplett-guide-for-svenska-foretag",
    },
  ],
  related: ["andra-text-pa-hemsidan", "andra-hemsida-byggd-i-nextjs", "uppdatera-priser-pa-hemsidan"],
  cta: "kund",
};

export default guide;
