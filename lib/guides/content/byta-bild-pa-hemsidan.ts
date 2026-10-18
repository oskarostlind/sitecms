import type { Guide } from "../types";

const guide: Guide = {
  slug: "byta-bild-pa-hemsidan",
  audience: "smaforetag",
  title: "Byta bild på hemsidan: storlek, format, alt-text",
  h1: "Byta bild på hemsidan: rätt storlek, format och alt-text på fem minuter",
  description:
    "Så byter du bild på hemsidan: välj en bild du får använda, skala till rätt pixelmått, komprimera gratis, skriv alt-text och undvik suddiga, beskurna bilder.",
  primaryQuery: "byta bild på hemsidan",
  published: "2026-10-18",
  modified: "2026-10-18",
  intro: [
    "För att byta bild på hemsidan väljer du en bild du har rätt att använda, skalar den till ungefär dubbla visningsbredden, komprimerar den, ger den ett beskrivande filnamn och laddar upp den med en alt-text. Själva bytet tar en minut i de flesta system. Det är förberedelserna som avgör om resultatet blir skarpt och snabbt.",
    "Guiden går igenom hela flödet i ordning och fungerar oavsett om sajten är byggd i WordPress, Wix, Squarespace eller av en byrå.",
  ],
  summary: [
    "Använd bara egna foton eller bilder med licens. En bild du hittat via Google får du i regel inte använda.",
    "Gör bilden ungefär dubbelt så bred som den visas: cirka 2 000 px för en toppbild, 1 200 px för en vanlig innehållsbild.",
    "Spara foton som JPG eller WebP, logotyper som SVG eller PNG, och komprimera i Squoosh eller TinyPNG innan du laddar upp.",
    "Skriv en alt-text som säger vad bilden visar och varför den finns där, inte \"bild\" eller ett filnamn.",
    "Blir bilden beskuren: välj ett bildförhållande som passar platsen eller sätt en fokuspunkt.",
  ],
  sections: [
    {
      id: "valj-bild",
      heading: "1. Välj en bild du får använda",
      blocks: [
        {
          type: "p",
          text: "Bilder på nätet är nästan alltid skyddade av upphovsrätt, även när det inte står något om det. Att en bild syns i Google Bildsök betyder inte att den är fri att använda. Företagarna har en kort genomgång av vad som gäller för bilder du hittat på internet (se källorna nedan). Det här är ingen juridisk rådgivning, men tre vägar är säkra i praktiken:",
        },
        {
          type: "ul",
          items: [
            "**Egna foton.** Bäst för de flesta småföretag: riktiga bilder på salongen, verkstaden eller teamet säger mer än en stockbild.",
            "**Köpta eller licensierade bilder** från en bildbyrå. Läs licensen: den kan begränsa var bilden får visas, hur länge och om den får beskäras eller användas i annonser. Spara kvittot eller licensen.",
            "**Bilder från en fotograf du anlitat.** Kom överens skriftligt om att ni får använda bilderna på webben och i sociala medier.",
          ],
        },
        {
          type: "tip",
          title: "Personal på bild",
          text: "Fråga alltid medarbetare innan du lägger upp porträtt, och kom överens om vad som händer med bilden när någon slutar.",
        },
      ],
    },
    {
      id: "ratt-storlek",
      heading: "2. Rätt pixelmått per bildtyp",
      blocks: [
        {
          type: "p",
          text: "En bild som är för liten blir suddig, en som är för stor gör sidan långsam. Tumregeln är att bilden ska vara ungefär dubbelt så bred som den största ytan den visas i, eftersom mobiler och moderna skärmar har tät pixeltäthet. Många system skapar sedan mindre versioner automatiskt.",
        },
        {
          type: "table",
          caption: "Tumregler för pixelmått (bredd × höjd). Anpassa efter din mall.",
          head: ["Bildtyp", "Rimligt mått", "Kommentar"],
          rows: [
            ["Stor toppbild (hero)", "ca 2 000–2 400 px bred", "Ofta beskuren olika på mobil och dator, se avsnitt 6."],
            ["Tjänstebild / innehållsbild", "ca 1 200–1 600 px bred", "Räcker för bilder som tar halva eller hela textspalten."],
            ["Personalporträtt", "ca 800 × 800 px eller 800 × 1 000 px", "Använd samma bildförhållande för alla i teamet."],
            ["Logotyp", "SVG, annars PNG i dubbel visningsstorlek", "Visas loggan 200 px bred, ladda upp 400 px."],
            ["Delningsbild (Facebook, LinkedIn m.fl.)", "1 200 × 630 px", "Meta rekommenderar 1 200 × 630 och max 8 MB."],
          ],
        },
        {
          type: "p",
          text: "Ladda inte upp mobilens originalfil direkt. WordPress skalar sedan version 5.3 automatiskt ner bilder som är bredare än 2 560 px, men filen du laddar upp bör ändå vara rimligt stor från början.",
        },
      ],
    },
    {
      id: "format-och-komprimering",
      heading: "3. Format och komprimering",
      blocks: [
        {
          type: "table",
          head: ["Format", "Använd till", "Undvik till"],
          rows: [
            ["JPG", "Foton. Fungerar överallt.", "Logotyper och text i bild (blir grumligt i kanterna)."],
            ["PNG", "Logotyper, ikoner, skärmdumpar, bilder med genomskinlig bakgrund.", "Stora foton (blir tunga filer)."],
            ["WebP", "Foton och grafik. Ofta betydligt mindre än JPG i samma kvalitet.", "Om ditt system inte tar emot formatet."],
            ["AVIF", "Foton där filstorleken är viktig.", "Om du är osäker på att systemet stödjer det. Välj då WebP eller JPG."],
            ["SVG", "Logotyper och ikoner som ska vara knivskarpa i alla storlekar.", "Foton. Vissa byggare tillåter inte SVG-uppladdning."],
          ],
        },
        {
          type: "p",
          text: "Komprimera innan du laddar upp. Två gratisverktyg som körs i webbläsaren: Squoosh (squoosh.app) från Google, där du kan ändra storlek, välja format och jämföra kvaliteten sida vid sida, och [TinyPNG](https://tinypng.com/), där du bara drar in filerna. Sänk kvaliteten stegvis och titta på resultatet i full storlek innan du sparar. Ser du kantiga skuggor eller grumliga ytor har du gått för långt.",
        },
      ],
    },
    {
      id: "filnamn-och-alt-text",
      heading: "4. Filnamn och alt-text",
      blocks: [
        {
          type: "p",
          text: "Döp om filen innan uppladdning: små bokstäver, bindestreck och vad bilden visar, till exempel `frisor-goteborg-balayage.webp` i stället för `IMG_4821.jpg`. Google använder både filnamn och alt-text för att förstå bilder.",
        },
        {
          type: "p",
          text: "Alt-texten läses upp av skärmläsare och visas om bilden inte laddar. Beskriv det som är viktigt i sammanhanget, kort. W3C:s beslutsträd för alt-texter och 1177:s riktlinjer för alt-texter är bra att luta sig mot. Rent dekorativa bilder ska ha tom alt-text, så att skärmläsaren hoppar över dem.",
        },
        {
          type: "table",
          caption: "Exempel på alt-text per bransch",
          head: ["Bransch", "Dålig alt-text", "Bra alt-text"],
          rows: [
            ["Frisör", "bild1", "Frisör färgar en kunds hår med balayageteknik"],
            ["Snickare", "snickare snickeri altan billig snickare", "Nybyggd altan i lärkträ med trappa ner mot gräsmattan"],
            ["Café", "Café", "Kanelbullar och kaffe på ett marmorbord i caféets fönster"],
            ["Redovisningsbyrå", "Anna", "Anna Berg, auktoriserad redovisningskonsult, i byråns mötesrum"],
            ["Bilverkstad", "IMG_0032", "Mekaniker byter bromsskivor på en bil på lyft"],
          ],
        },
      ],
    },
    {
      id: "sa-byter-du",
      heading: "5. Själva bytet i olika system",
      blocks: [
        { type: "h3", text: "WordPress" },
        {
          type: "ol",
          items: [
            "Öppna sidan i blockredigeraren och klicka på bilden.",
            "Välj **Ersätt** i verktygsfältet och ladda upp den nya filen.",
            "Fyll i alt-text i blockets inställningar till höger och klicka **Uppdatera**.",
          ],
        },
        {
          type: "p",
          text: "Toppbilder ligger ofta i ett omslagsblock eller i temats inställningar. WordPress kan inte ersätta en fil i mediebiblioteket utan tillägg (till exempel Enable Media Replace), så den gamla bilden ligger kvar där tills du raderar den.",
        },
        { type: "h3", text: "Wix, Squarespace och One.com-byggaren" },
        {
          type: "p",
          text: "Klicka på bilden i redigeraren, välj att byta eller ändra bild, ladda upp och skriv alt-texten i bildinställningarna. Publicera sedan, ändringen syns inte förrän du gjort det.",
        },
        { type: "h3", text: "Byråbyggd eller egenutvecklad sajt" },
        {
          type: "p",
          text: "Har sajten ett CMS loggar du in där och byter bilden i rätt fält. Saknas det får du skicka bilden till byrån. Skicka då originalfilen, alt-texten och vilken sida det gäller i samma mejl. Är sajten byggd i Next.js kan utvecklaren koppla på ett CMS som sitecms så att du byter bild och alt-text själv, se [hemsida byggd i Next.js](/guider/andra-hemsida-byggd-i-nextjs). Vad det kostar att låta byrån göra det läser du i [vad kostar en textändring](/guider/vad-kostar-en-textandring).",
        },
      ],
    },
    {
      id: "suddig-eller-beskuren",
      heading: "6. Varför blir bilden suddig eller beskuren?",
      blocks: [
        {
          type: "ul",
          items: [
            "**Suddig:** bilden är för liten för ytan och förstoras i webbläsaren. Ladda upp en bredare version enligt tabellen ovan. Det kan också bero på för hård komprimering.",
            "**Beskuren:** mallen visar bilden i ett fast bildförhållande, till exempel 16:9 på dator och nästan kvadratiskt på mobil. Ett stående foto i en liggande yta tappar då topp och botten.",
            "**Huvudet försvinner på mobil:** sätt en fokuspunkt. WordPress omslagsblock, Squarespace och flera av Wix bildelement låter dig välja vilken del av bilden som alltid ska synas.",
          ],
        },
        {
          type: "tip",
          title: "Snabbtest",
          text: "Öppna sidan på mobilen direkt efter bytet. De flesta beskärningsproblem syns bara där.",
        },
        {
          type: "p",
          text: "Ska du samtidigt uppdatera texten bredvid bilden, se [ändra text på hemsidan](/guider/andra-text-pa-hemsidan). Ny tjänst med egen bild? Läs [lägga till en tjänst](/guider/lagga-till-tjanst-pa-hemsidan).",
        },
      ],
    },
  ],
  faq: [
    {
      q: "Vilken storlek ska en bild på hemsidan ha?",
      a: "Ungefär dubbelt så bred som ytan den visas i. Som tumregel räcker cirka 2 000 px bredd för en toppbild, 1 200–1 600 px för en innehållsbild och 1 200 × 630 px för en delningsbild. Komprimera alltid innan uppladdning.",
    },
    {
      q: "Ska jag använda JPG, PNG eller WebP?",
      a: "JPG eller WebP för foton, PNG eller SVG för logotyper och grafik med skarpa kanter eller genomskinlig bakgrund. WebP ger oftast mindre filer än JPG i samma kvalitet, men kontrollera att ditt system tar emot formatet.",
    },
    {
      q: "Vad är alt-text och måste jag skriva det?",
      a: "Alt-text är en kort beskrivning av bilden som skärmläsare läser upp och som visas om bilden inte laddar. Skriv det för alla bilder som tillför information. Dekorativa bilder ska ha tom alt-text.",
    },
    {
      q: "Varför blir min bild suddig eller beskuren på hemsidan?",
      a: "Suddig betyder oftast att bilden är för liten för ytan eller för hårt komprimerad. Beskuren betyder att mallen har ett fast bildförhållande. Ladda upp en större bild, välj ett format som passar ytan eller sätt en fokuspunkt.",
    },
    {
      q: "Får jag använda bilder från Google på min hemsida?",
      a: "I regel inte. Bilder i Google Bildsök tillhör någon och är oftast skyddade av upphovsrätt. Använd egna foton, köpta bilder med licens eller bilder du fått skriftligt tillstånd att använda.",
    },
  ],
  sources: [
    {
      title: "Företagarna: Får jag använda en bild jag hittat på internet på min hemsida?",
      url: "https://www.foretagarna.se/juridisk-faq/immaterialratt/far-jag-anvanda-en-bild-jag-hittat-pa-internet-pa-min-hemsida/",
    },
    { title: "Meta for Developers: Images in Link Shares", url: "https://developers.facebook.com/docs/sharing/webmasters/images" },
    { title: "web.dev: Learn Images", url: "https://web.dev/learn/images?hl=en" },
    {
      title: "WordPress: Introducing handling of big images in WordPress 5.3",
      url: "https://make.wordpress.org/core/2019/10/09/introducing-handling-of-big-images-in-wordpress-5-3/",
    },
    { title: "Squoosh (PCWorld): Google's free Squoosh tool", url: "https://www.pcworld.com/article/3195269/googles-free-sqoosh-tool-takes-the-guesswork-out-of-image-compression.html" },
    { title: "TinyPNG", url: "https://tinypng.com/" },
    { title: "W3C WAI: An alt Decision Tree", url: "https://w3.org/WAI/tutorials/images/decision-tree/" },
    {
      title: "1177: Riktlinjer för alt-texter och bildtexter",
      url: "https://www.1177.se/riktlinjer-och-material/riktlinjer-for-bild-och-video/riktlinjer-for-alt-texter-och-bildtexter/",
    },
    {
      title: "Trafikverket: Tillgängliga bilder med alternativtexter",
      url: "https://www.trafikverket.se/om-oss/pressrum/grafisk-profil-dold/tillganglighet-och-gdpr/tillgangliga-dokument/tillgangliga-bilder-med-alternativtexter-alt-texter/",
    },
    { title: "Google: Bästa praxis för bilder i Google Sök", url: "https://support.google.com/webmasters/answer/114016" },
    { title: "WordPress-tillägget Enable Media Replace", url: "https://br.wordpress.org/plugins/enable-media-replace/embed/" },
    {
      title: "Wix: Ändra fokuspunkten på en bild eller video",
      url: "https://support.wix.com/sv/article/wix-pro-gallery-ändra-fokuspunkten-på-en-bild-eller-video",
    },
    { title: "Cover Block (WordPress-dokumentation, arkiv)", url: "https://webcf.waybackmachine.org/web/20211021184733/https://wordpress.org/support/article/cover-block" },
  ],
  related: ["andra-text-pa-hemsidan", "lagga-till-tjanst-pa-hemsidan", "lagga-upp-nyheter-pa-hemsidan"],
  cta: "kund",
};

export default guide;
