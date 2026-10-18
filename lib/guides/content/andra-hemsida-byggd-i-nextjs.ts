import type { Guide } from "../types";

const guide: Guide = {
  slug: "andra-hemsida-byggd-i-nextjs",
  audience: "smaforetag",
  title: "Hemsida byggd i Next.js? Ändra texten själv",
  h1: "Min hemsida är byggd i Next.js eller React – kan jag ändra texterna själv?",
  description:
    "Därför finns det ingen inloggning på en hemsida byggd i Next.js eller React, och tre sätt att kunna ändra texterna själv. Med färdigt mejl till utvecklaren.",
  primaryQuery: "hemsida byggd i react ändra text",
  published: "2026-10-18",
  modified: "2026-10-18",
  intro: [
    "Inte direkt. På en hemsida byggd i Next.js eller React sitter texterna oftast i koden, så det finns ingen inloggning där du kan ändra dem.",
    "Det går att ändra på. Antingen ber du utvecklaren om varje ändring, låter utvecklaren koppla in ett redigeringsverktyg (ett så kallat headless CMS) eller bygger om sajten i en hemsidebyggare. Här är vad varje väg innebär och exakt vad du ska be utvecklaren om.",
  ],
  summary: [
    "Next.js och React är verktyg för att bygga sajter, inte system med inloggning. Texterna skrivs in av utvecklaren.",
    "Kontrollera med tillägget Wappalyzer eller genom att söka efter `_next/static` i sidkällan.",
    "Vill du ändra själv: be utvecklaren koppla ett headless CMS till sajten. Designen kan vara kvar.",
    "Ändrar du sällan räcker det ofta att mejla utvecklaren. Vill du sköta allt själv och slippa utvecklaren helt är en hemsidebyggare ett alternativ.",
  ],
  sections: [
    {
      id: "varfor-ingen-inloggning",
      heading: "Varför det inte finns någon inloggning",
      blocks: [
        {
          type: "p",
          text: "WordPress och Wix är färdiga system med en redigeringsvy inbyggd. Next.js och React är något annat: verktyg som utvecklare använder för att bygga en sajt från grunden. React är ett kodbibliotek för att bygga gränssnitt, och Next.js är ett ramverk ovanpå React.",
        },
        {
          type: "p",
          text: "Tänk dig skillnaden mellan en whiteboard och en tryckt skylt. I WordPress skriver du på whiteboarden. På en Next.js-sajt har utvecklaren skrivit texten direkt i sajtens filer, ungefär som att trycka den. Att byta en mening innebär att ändra filen och publicera om sajten.",
        },
        {
          type: "p",
          text: "Det är inget fel i sig. Sådana sajter blir ofta snabba och helt anpassade. Men om ingen planerat för att du ska kunna redigera, så kan du inte det.",
        },
      ],
    },
    {
      id: "kontrollera",
      heading: "Så ser du att sajten är byggd i Next.js eller React",
      blocks: [
        {
          type: "ol",
          items: [
            "**Använd Wappalyzer.** Installera det gratis webbläsartillägget, gå till din sajt och klicka på ikonen. Står det Next.js eller React under ramverk har du svaret.",
            "**Sök i sidkällan.** Högerklicka och välj Visa sidkälla (Ctrl+U på Windows), tryck Ctrl+F och sök efter `_next/static`. Träff betyder nästan alltid Next.js. Även `__NEXT_DATA__` är en ledtråd.",
            "**Testa `/wp-admin`.** Får du en felsida är det i alla fall inte WordPress.",
            "**Fråga utvecklaren** vilket ramverk sajten är byggd i och var koden ligger.",
          ],
        },
        {
          type: "p",
          text: "Visar det sig att sajten är byggd i WordPress, Wix eller en annan hemsidebyggare kan du sannolikt redigera själv. Läs då [guiden om att ändra text på hemsidan](/guider/andra-text-pa-hemsidan) i stället.",
        },
      ],
    },
    {
      id: "tre-vagar",
      heading: "Tre vägar: jämförelse",
      blocks: [
        {
          type: "p",
          text: "Det finns inget universellt rätt svar. En snickare som byter text två gånger om året har andra behov än ett café som uppdaterar menyn varje vecka.",
        },
        {
          type: "table",
          caption: "För- och nackdelar",
          head: ["", "Be utvecklaren varje gång", "Koppla ett headless CMS", "Bygg om i hemsidebyggare"],
          rows: [
            ["Tid per ändring", "Dagar, beror på utvecklaren", "Minuter, du gör själv", "Minuter, du gör själv"],
            ["Kostnad", "Betalning per ändring eller löpande avtal", "Engångsjobb för utvecklaren, ibland månadsavgift för verktyget", "Abonnemang på byggaren plus tid för att bygga om"],
            ["Risk", "Låg, en van person gör jobbet", "Låg om fälten är väl avgränsade", "Design och funktioner kan behöva ändras eller försvinna"],
            ["Vem gör vad", "Du mejlar, utvecklaren ändrar och publicerar", "Utvecklaren sätter upp, du redigerar", "Du eller någon du anlitar bygger, sedan sköter du allt"],
            ["Passar när", "Du ändrar sällan", "Du ändrar ofta men vill ha kvar sajten", "Sajten ändå behöver göras om"],
          ],
        },
        {
          type: "p",
          text: "Hur mycket en enskild ändring brukar kosta via byrå beskriver vi i [guiden om vad en textändring kostar](/guider/vad-kostar-en-textandring).",
        },
      ],
    },
    {
      id: "cms-i-efterhand",
      heading: "Vad det innebär att lägga till ett CMS i efterhand",
      blocks: [
        {
          type: "p",
          text: "Ett headless CMS är ett redigeringsverktyg som bara hanterar innehållet. Sajten ser likadan ut, men texterna hämtas från verktyget i stället för att stå i koden. Du loggar in där och ändrar, utvecklaren behöver inte vara inblandad.",
        },
        {
          type: "p",
          text: "För utvecklaren innebär det ungefär detta:",
        },
        {
          type: "ol",
          items: [
            "Välja verktyg och bestämma vilka texter och bilder du ska kunna ändra.",
            "Flytta ut de texterna ur koden och in i verktyget.",
            "Koppla sajten så att ändringar syns när du sparar.",
            "Bjuda in dig med ett eget konto och visa hur det fungerar.",
          ],
        },
        {
          type: "p",
          text: "Hur stort jobbet blir beror på hur sajten är byggd och hur mycket som ska bli redigerbart. Be därför om en offert för just din sajt. Att börja med de texter du faktiskt ändrar, som priser, öppettider och nyheter, håller nere arbetet.",
        },
        {
          type: "h3",
          text: "Vanliga verktyg",
        },
        {
          type: "ul",
          items: [
            "**[Sanity](https://www.sanity.io/pricing)**, **[Storyblok](https://storyblok.com/pricing)** och **[Contentful](https://contentful.com/plans)** är etablerade, internationella headless CMS med färdiga kopplingar till Next.js. Alla tre har en gratisnivå med begränsningar, till exempel i antal användare. Kolla deras prissidor för aktuella villkor.",
            "**sitecms** är ett svenskt alternativ byggt för Next.js-sajter. Utvecklaren kopplar sajten med ett npm-paket och bjuder in dig som redaktör. Du ändrar texter, bilder och priser i fasta fält, kan inte råka ha sönder layouten och kan ångra senaste ändringen. Det är gratis att börja, och tekniken beskrivs i [dokumentationen](/docs).",
          ],
        },
      ],
    },
    {
      id: "mejl-till-utvecklaren",
      heading: "Exakt vad du ska be utvecklaren om",
      blocks: [
        {
          type: "p",
          text: "Ett tydligt mejl sparar tid för båda. Kopiera, fyll i hakparenteserna och skicka.",
        },
        {
          type: "code",
          lang: "text",
          code: `Ämne: Kan jag få redigera texterna på hemsidan själv?

Hej [namn],

Jag vill kunna ändra texter på [dinfirma.se] själv, utan att behöva
be dig om varje ändring. Som jag förstår det är sajten byggd i
Next.js/React och texterna ligger i koden.

Det jag ändrar oftast är:
- [t.ex. priser och tjänster]
- [t.ex. öppettider]
- [t.ex. nyheter och erbjudanden]

Kan du:
1. Föreslå hur jag kan redigera de här texterna själv, till exempel
   genom att koppla ett headless CMS till sajten?
2. Ge en offert eller uppskattning för att sätta upp det, och berätta
   om verktyget har någon löpande månadskostnad?
3. Bekräfta att designen och sajtens funktioner blir kvar som idag?
4. Se till att kontot står på företaget och att jag får en egen
   inloggning?

Jag vill också gärna ha en kopia av koden, eller tillgång till var den
ligger, så att företaget har den.

Tack!
[ditt namn]`,
        },
        {
          type: "tip",
          title: "Äger du koden?",
          text: "Fråga alltid var koden ligger och vem som äger kontot. Om utvecklaren slutar svara är det koden och kontona som gör att någon annan kan ta över.",
        },
        {
          type: "p",
          text: "Om din utvecklare vill läsa på om upplägget finns en [guide om att låta kunden redigera en Next.js-sajt](/guider/lat-kunden-redigera-nextjs).",
        },
      ],
    },
  ],
  faq: [
    {
      q: "Varför kan jag inte logga in på min hemsida?",
      a: "Om sajten är byggd i Next.js, React eller liknande finns det ofta ingen inloggning, eftersom texterna ligger direkt i koden. Inloggning finns bara om utvecklaren har kopplat in ett redigeringsverktyg. Fråga utvecklaren vilket ramverk sajten använder.",
    },
    {
      q: "Vad är ett headless CMS?",
      a: "Ett redigeringsverktyg som bara sköter innehållet, inte utseendet. Du ändrar texter och bilder i verktyget, och sajten hämtar dem därifrån. Det gör att en egenbyggd sajt kan få redigering utan att designen byggs om.",
    },
    {
      q: "Kan jag ändra texten direkt i koden själv?",
      a: "Tekniskt ja, om du får tillgång till koden. Men du behöver också kunna publicera om sajten, och ett felaktigt tecken kan stoppa publiceringen. För de flesta är det bättre att låta utvecklaren koppla ett redigeringsverktyg.",
    },
    {
      q: "Måste jag bygga om hela hemsidan för att kunna redigera själv?",
      a: "Nej. Ett headless CMS kan kopplas till den befintliga sajten så att designen blir kvar. Ombyggnad i en hemsidebyggare är bara rimligt om sajten ändå behöver göras om.",
    },
    {
      q: "Vad kostar det att lägga till ett CMS i efterhand?",
      a: "Det beror på hur sajten är byggd och hur många texter som ska bli redigerbara, så be om en offert. Flera verktyg har gratisnivåer, men utvecklarens tid för att koppla in dem tillkommer.",
    },
  ],
  sources: [
    { title: "Next.js: About React and Next.js", url: "https://nextjs.org/learn/react-foundations/what-is-react-and-nextjs" },
    { title: "Next.js docs: assetPrefix (/_next/static)", url: "https://nextjs.org/docs/app/api-reference/config/next-config-js/assetPrefix" },
    { title: "ExpertBeacon: Web Scraping Next.js Sites (__NEXT_DATA__)", url: "https://expertbeacon.com/web-scraping-next-js-sites-harnessing-react-hydration-for-easy-data-extraction/" },
    { title: "Wappalyzer: Frequently asked questions (extension)", url: "https://www.wappalyzer.com/faq/extension/" },
    { title: "Wappalyzer: Websites using Next.js", url: "https://www.wappalyzer.com/technologies/javascript-frameworks/next-js/" },
    { title: "Sanity: Pricing", url: "https://www.sanity.io/pricing" },
    { title: "Sanity: The official Sanity toolkit for Next.js", url: "https://www.sanity.io/plugins/next-sanity" },
    { title: "Storyblok: Pricing", url: "https://storyblok.com/pricing" },
    { title: "Storyblok: Integrate Next.js with Storyblok", url: "https://www.storyblok.com/docs/quickstarts/nextjs" },
    { title: "Contentful: Pricing", url: "https://contentful.com/plans" },
    { title: "Contentful: How to Integrate Contentful and Next.js App Router", url: "https://www.contentful.com/blog/integrate-contentful-next-js-app-router/" },
  ],
  related: ["andra-text-pa-hemsidan", "lat-kunden-redigera-nextjs", "vad-kostar-en-textandring"],
  cta: "kund",
};

export default guide;
