import type { Guide } from "../types";

const guide: Guide = {
  slug: "lagga-upp-nyheter-pa-hemsidan",
  audience: "smaforetag",
  title: "Lägga upp nyheter på hemsidan – så gör du",
  h1: "Lägga upp nyheter på hemsidan – vad du ska skriva, hur ofta och hur det hjälper på Google",
  description:
    "Vad ska ett litet företag skriva nyheter om, och hur ofta? Ämnesidéer per bransch, en färdig inläggsmall och steg för WordPress, Wix och andra system.",
  primaryQuery: "lägga upp nyheter på hemsidan",
  published: "2026-10-18",
  modified: "2026-10-18",
  intro: [
    "Du lägger upp en nyhet på hemsidan genom att skapa ett nytt inlägg i sajtens redigeringsverktyg, skriva en tydlig rubrik och ett par stycken som svarar på vad som är nytt, lägga till en bild med alt-text och publicera. Det svåra är sällan tekniken utan att veta vad man ska skriva om och hur ofta.",
    "Kort sagt: skriv när du har något som dina kunder faktiskt har nytta av att veta, och se till att det som ligger ute stämmer. Det finns ingen magisk frekvens.",
  ],
  summary: [
    "**Nyhet** = något som har hänt eller ändrats (nya tider, ny tjänst, semesterstängt). **Blogginlägg** = tips och kunskap som håller längre.",
    "Det finns ingen frekvens som Google belönar. Skriv när du har något nyttigt att säga, och håll det du redan har publicerat aktuellt.",
    "Använd samma mall varje gång: rubrik, ingress, kort brödtext, bild med alt-text och en tydlig uppmaning.",
    "Gamla nyheter: uppdatera det som fortfarande är relevant, avpublicera det som är fel eller vilseledande, behåll resten som arkiv.",
  ],
  sections: [
    {
      id: "nyhet-eller-blogg",
      heading: "Nyhet eller blogginlägg – vad är skillnaden?",
      blocks: [
        {
          type: "p",
          text: "I de flesta system är en nyhet och ett blogginlägg tekniskt samma sak: ett inlägg med datum, rubrik och text. Skillnaden ligger i vad du skriver och hur länge det håller.",
        },
        {
          type: "table",
          head: ["", "Nyhet", "Blogginlägg"],
          rows: [
            ["Handlar om", "Något som har hänt eller ändrats hos dig", "Kunskap, tips eller svar på vanliga kundfrågor"],
            ["Exempel", "”Vi har öppet i mellandagarna”", "”Så tar du hand om nyslipade trägolv”"],
            ["Livslängd", "Kort, ofta veckor eller månader", "Lång, kan vara relevant i flera år"],
            ["Passar när", "Du vill informera befintliga kunder", "Du vill bli hittad av nya kunder som söker svar"],
          ],
        },
        {
          type: "p",
          text: "Har du bara ork för det ena: börja med nyheter. De kräver mindre tid. Blogginlägg är en större investering men kan oftare dra nya besökare via sök.",
        },
      ],
    },
    {
      id: "hur-ofta",
      heading: "Hur ofta ska du lägga upp nyheter?",
      blocks: [
        {
          type: "p",
          text: "Ärligt svar: så ofta som du har något värt att säga. Google skriver i sina riktlinjer att sökmotorns system är byggda för att prioritera hjälpsamt och pålitligt innehåll som är skapat för människor, det de kallar **helpful, reliable, people-first content**. Där finns inget om att man måste publicera varje vecka.",
        },
        {
          type: "p",
          text: "Tvärtom varnar Google för innehåll som görs främst för sökmotorn. Två av varningstecknen i riktlinjerna är att ändra datum på sidor för att de ska verka färska utan att innehållet har ändrats, och att lägga till eller ta bort mycket innehåll bara för att man tror att det hjälper rankingen. Google svarar själva att det inte gör det.",
        },
        {
          type: "p",
          text: "Det som spelar roll i praktiken:",
        },
        {
          type: "ul",
          items: [
            "**Nytta för läsaren.** En nyhet om ändrade öppettider är mer värd än tre inlägg som säger ”vi finns kvar”.",
            "**Att det som ligger ute är aktuellt.** En nyhet om en kampanj som tog slut för ett år sedan ger ett sämre intryck än ingen nyhet alls.",
            "**En rytm du klarar.** En nyhet i månaden som du faktiskt håller är bättre än en ambition om en i veckan som dör i mars.",
          ],
        },
        {
          type: "tip",
          title: "Tumregel",
          text: "Fråga dig: skulle en kund ringa och fråga om det här om det inte stod på sajten? Om ja, är det en nyhet.",
        },
      ],
    },
    {
      id: "amnesideer",
      heading: "Vad ska ett litet företag skriva om? Idéer per bransch",
      blocks: [
        {
          type: "p",
          text: "Det mesta du redan berättar för kunder i telefon eller i kassan kan bli en nyhet. Här är konkreta förslag att låna:",
        },
        {
          type: "table",
          caption: "Ämnesidéer för nyheter och blogginlägg",
          head: ["Bransch", "Idéer"],
          rows: [
            ["Frisör", "Ny frisör i teamet · Öppettider kring helger · Nya produkter i butiken · Säsongens behandling · Så bokar du om eller avbokar"],
            ["Snickare", "Lediga tider i höst · Före/efter från ett nyligen avslutat jobb · Vad som gäller för ROT-avdrag hos oss · Ny tjänst, t.ex. altanbygge · Så går ett första platsbesök till"],
            ["Café", "Veckans eller säsongens meny · Ändrade öppettider · Evenemang och livemusik · Ny leverantör av bröd eller kaffe · Catering och beställningar inför högtider"],
            ["Redovisningsbyrå", "Viktiga datum för deklaration och moms · Ny medarbetare · Påminnelse inför bokslut · Ny tjänst, t.ex. lönehantering · Vanliga frågor från kunder just nu"],
            ["Bilverkstad", "Dags för däckbyte – så bokar du · Lediga tider · Ny utrustning eller certifiering · Tips inför vintern · Ändrade öppettider i sommar"],
          ],
        },
        {
          type: "p",
          text: "Lägger du till en helt ny tjänst förtjänar den oftast en egen sida, inte bara en nyhet. Se [så lägger du till en tjänst på hemsidan](/guider/lagga-till-tjanst-pa-hemsidan) och låt nyheten länka dit.",
        },
      ],
    },
    {
      id: "mall",
      heading: "En mall för varje nyhet",
      blocks: [
        {
          type: "p",
          text: "Använd samma upplägg varje gång. Då går det fort och läsaren hittar rätt.",
        },
        {
          type: "ol",
          items: [
            "**Rubrik** som säger vad som är nytt, inte ”Nyhet!”. Exempel: ”Vi har öppet i mellandagarna 27–30 december”.",
            "**Ingress**, en eller två meningar som ger hela beskedet. Många läser bara den.",
            "**Brödtext**, två till fyra korta stycken med detaljerna: vad, när, för vem och vad det betyder för kunden.",
            "**Bild med alt-text.** Beskriv vad bilden visar, t.ex. ”Nylagd altan i tryckimpregnerat trä vid ett radhus”. Alt-texten hjälper personer som använder skärmläsare och Google att förstå bilden.",
            "**Uppmaning**: vad ska läsaren göra nu? ”Boka tid”, ”Ring oss”, ”Se hela menyn”, gärna med en länk.",
          ],
        },
        {
          type: "p",
          text: "Behöver du byta eller beskära en bild innan du lägger upp den finns det steg för det i guiden om att [byta bild på hemsidan](/guider/byta-bild-pa-hemsidan).",
        },
      ],
    },
    {
      id: "publicera",
      heading: "Så publicerar du en nyhet i olika system",
      blocks: [
        { type: "h3", text: "WordPress" },
        {
          type: "ol",
          items: [
            "Logga in i adminpanelen (oftast `dinsajt.se/wp-admin`).",
            "Gå till **Inlägg → Lägg till nytt**.",
            "Skriv rubrik och text, lägg till en bild och välj gärna en kategori som ”Nyheter”.",
            "Klicka **Publicera**. Vill du att nyheten ska gå ut senare kan du ställa in datum och tid innan du publicerar.",
          ],
        },
        { type: "h3", text: "Wix, Squarespace och liknande byggare" },
        {
          type: "p",
          text: "Här bygger nyheter nästan alltid på en bloggfunktion som behöver vara tillagd på sajten. Leta efter **Blogg** i panelen, skapa ett nytt inlägg, fyll i rubrik, text och bild och publicera. Finns ingen blogg på sajten måste den läggas till först, och namnet på sidan kan sedan ändras till ”Nyheter”.",
        },
        { type: "h3", text: "Byråbyggd eller egenutvecklad sajt" },
        {
          type: "p",
          text: "Är sajten kodad från grunden, till exempel i Next.js eller React, beror allt på om utvecklaren har kopplat ett CMS. Finns det ett, loggar du in där och skapar inlägget. Finns det inget måste du skicka texten till utvecklaren varje gång. Läs mer i [ändra en hemsida byggd i Next.js](/guider/andra-hemsida-byggd-i-nextjs). Ett alternativ för just Next.js-sajter är att utvecklaren kopplar på ett CMS som sitecms, där du själv kan publicera och avpublicera nyheter.",
        },
      ],
    },
    {
      id: "gamla-nyheter",
      heading: "Vad gör du med gamla nyheter?",
      blocks: [
        {
          type: "p",
          text: "Du behöver inte rensa bort allt som är gammalt. Gå igenom nyhetslistan någon gång per halvår och välj ett av tre alternativ:",
        },
        {
          type: "ul",
          items: [
            "**Uppdatera** om innehållet fortfarande är relevant men någon detalj har ändrats, till exempel ett pris eller en kontaktperson.",
            "**Avpublicera** det som är fel eller kan vilseleda: kampanjer som har gått ut, personal som har slutat, tjänster du inte längre erbjuder.",
            "**Behåll** resten som arkiv. En gammal nyhet om att ni flyttade till nya lokaler skadar inte.",
          ],
        },
        {
          type: "warning",
          title: "Ändra inte bara datumet",
          text: "Att flytta upp ett gammalt inlägg genom att byta datum utan att ändra innehållet är precis det Google nämner som ett varningstecken. Uppdatera innehållet på riktigt, eller låt det vara.",
        },
        {
          type: "p",
          text: "Gäller ändringen själva sidtexterna snarare än en nyhet, se [ändra text på hemsidan](/guider/andra-text-pa-hemsidan).",
        },
      ],
    },
  ],
  faq: [
    {
      q: "Vad ska ett litet företag skriva nyheter om?",
      a: "Om sådant kunderna har nytta av att veta: ändrade öppettider, nya tjänster, nya medarbetare, lediga tider, säsongserbjudanden och evenemang. En bra tumregel är att skriva om det du annars skulle behöva svara på i telefon.",
    },
    {
      q: "Hur ofta ska jag lägga upp nyheter på hemsidan?",
      a: "Det finns ingen frekvens som Google kräver eller belönar i sig. Publicera när du har något nyttigt att säga och välj en rytm du orkar hålla. Viktigare än antalet inlägg är att det som ligger ute stämmer.",
    },
    {
      q: "Hjälper nyheter för Google?",
      a: "Nyheter i sig ger ingen automatisk rankingfördel. Googles riktlinjer handlar om att innehållet ska vara hjälpsamt och skrivet för människor. Nyttiga inlägg, särskilt de som svarar på vanliga frågor, kan däremot ge sajten fler sidor som är värda att hitta.",
    },
    {
      q: "Ska jag ta bort gamla nyheter från hemsidan?",
      a: "Bara de som är felaktiga eller vilseledande, som utgångna kampanjer eller tjänster du slutat med. Uppdatera det som fortfarande är relevant och låt resten ligga kvar som arkiv.",
    },
    {
      q: "Vad är skillnaden mellan en nyhet och ett blogginlägg?",
      a: "En nyhet berättar att något har hänt eller ändrats och är aktuell en kortare tid. Ett blogginlägg delar kunskap eller tips som håller längre. Tekniskt är det ofta samma typ av inlägg i systemet.",
    },
  ],
  sources: [
    {
      title: "Google Search Central: Creating helpful, reliable, people-first content",
      url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
    },
    {
      title: "Google Search Central: Google image SEO best practices",
      url: "https://developers.google.com/search/docs/appearance/google-images",
    },
    {
      title: "WordPress.org Documentation: Write posts (Classic Editor)",
      url: "https://wordpress.org/documentation/article/write-posts-classic/",
    },
  ],
  related: ["byta-bild-pa-hemsidan", "lagga-till-tjanst-pa-hemsidan", "andra-text-pa-hemsidan"],
  cta: "kund",
};

export default guide;
