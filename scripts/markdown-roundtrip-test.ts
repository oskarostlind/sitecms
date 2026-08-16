/**
 * Regressionstest för markdown-bryggan (lib/markdown.ts).
 *
 * Kör: npm run test:markdown
 *
 * Bryggan är den enda kopplingen mellan WYSIWYG-editorn och det som ligger i
 * databasen. Går den sönder tappar kunderna formatering vid sparning — utan
 * felmeddelande. Därför testas båda riktningarna och en full runda
 * markdown -> HTML -> (editorns dokument) -> markdown.
 *
 * Dokumenten nedan är formen tiptap producerar (editor.getJSON()), skrivna för
 * hand så att testet kan köras utan webbläsare.
 */
import {
  markdownToHtml,
  markdownToPlainText,
  richDocToMarkdown,
  type RichNode,
} from "../lib/markdown";

let failures = 0;

function check(name: string, actual: string, expected: string) {
  if (actual === expected) {
    console.log(`PASS  ${name}`);
    return;
  }
  failures += 1;
  console.log(`FAIL  ${name}`);
  console.log(`  förväntat: ${JSON.stringify(expected)}`);
  console.log(`  faktiskt:  ${JSON.stringify(actual)}`);
}

function text(value: string, ...marks: { type: string; attrs?: Record<string, unknown> }[]): RichNode {
  return { type: "text", text: value, marks: marks.length ? marks : undefined };
}

function paragraph(...content: RichNode[]): RichNode {
  return { type: "paragraph", content };
}

// ---------------------------------------------------------------------------
// markdown -> HTML
// ---------------------------------------------------------------------------

check(
  "rubriker",
  markdownToHtml("# Ett\n## Två\n### Tre\n#### Fyra"),
  "<h2>Ett</h2><h2>Två</h2><h3>Tre</h3><h3>Fyra</h3>"
);

check(
  "fet och kursiv",
  markdownToHtml("Text med **fet** och *kursiv* stil."),
  "<p>Text med <strong>fet</strong> och <em>kursiv</em> stil.</p>"
);

check(
  "länk",
  markdownToHtml("Se [vår sajt](https://jjbyggboden.se) idag."),
  '<p>Se <a href="https://jjbyggboden.se">vår sajt</a> idag.</p>'
);

check(
  "länk med farligt protokoll blir vanlig text",
  markdownToHtml("[klicka](javascript:alert(1))"),
  "<p>[klicka](javascript:alert(1))</p>"
);

check(
  "HTML i innehållet escapas",
  markdownToHtml('<script>alert("hej")</script>'),
  "<p>&lt;script&gt;alert(&quot;hej&quot;)&lt;/script&gt;</p>"
);

check(
  "punktlista",
  markdownToHtml("- ett\n- två"),
  "<ul><li>ett</li><li>två</li></ul>"
);

check(
  "nästlad punktlista",
  markdownToHtml("- ett\n  - underpunkt\n- två"),
  "<ul><li>ett<ul><li>underpunkt</li></ul></li><li>två</li></ul>"
);

check(
  "numrerad lista",
  markdownToHtml("1. ett\n2. två"),
  "<ol><li>ett</li><li>två</li></ol>"
);

check("citat", markdownToHtml("> citat"), "<blockquote><p>citat</p></blockquote>");

check(
  "radbrytning inom stycke",
  markdownToHtml("rad ett\nrad två"),
  "<p>rad ett<br />rad två</p>"
);

check("tomt innehåll", markdownToHtml(null), "");

// ---------------------------------------------------------------------------
// editorns dokument -> markdown
// ---------------------------------------------------------------------------

check(
  "serialiserar rubrik och stycke",
  richDocToMarkdown({
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [text("Rubrik")] },
      paragraph(text("Vanlig "), text("fet", { type: "bold" }), text(" text")),
    ],
  }),
  "## Rubrik\n\nVanlig **fet** text"
);

check(
  "serialiserar länk",
  richDocToMarkdown({
    type: "doc",
    content: [
      paragraph(
        text("Läs ", ),
        text("mer", { type: "link", attrs: { href: "https://jjbyggboden.se" } })
      ),
    ],
  }),
  "Läs [mer](https://jjbyggboden.se)"
);

check(
  "serialiserar listor",
  richDocToMarkdown({
    type: "doc",
    content: [
      {
        type: "bulletList",
        content: [
          { type: "listItem", content: [paragraph(text("ett"))] },
          { type: "listItem", content: [paragraph(text("två"))] },
        ],
      },
      {
        type: "orderedList",
        content: [
          { type: "listItem", content: [paragraph(text("först"))] },
          { type: "listItem", content: [paragraph(text("sedan"))] },
        ],
      },
    ],
  }),
  "- ett\n- två\n\n1. först\n2. sedan"
);

check(
  "serialiserar nästlad lista",
  richDocToMarkdown({
    type: "doc",
    content: [
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              paragraph(text("ett")),
              {
                type: "bulletList",
                content: [{ type: "listItem", content: [paragraph(text("under"))] }],
              },
            ],
          },
        ],
      },
    ],
  }),
  "- ett\n  - under"
);

check(
  "serialiserar radbrytning",
  richDocToMarkdown({
    type: "doc",
    content: [paragraph(text("rad ett"), { type: "hardBreak" }, text("rad två"))],
  }),
  "rad ett\nrad två"
);

check(
  "escapar markdown-tecken i vanlig text",
  richDocToMarkdown({
    type: "doc",
    content: [paragraph(text("2 * 3 [ungefär]"))],
  }),
  "2 \\* 3 \\[ungefär\\]"
);

// ---------------------------------------------------------------------------
// Full runda: markdown som redan finns i databasen ska överleva en redigering
// ---------------------------------------------------------------------------

const stored = [
  "## Nytt tak i Boden",
  "",
  "Vi har lagt **nytt tak** på en villa i *Boden*.",
  "",
  "- Rivning av gammalt tak",
  "- Ny läkt och papp",
  "",
  "1. Offert",
  "2. Utförande",
  "",
  "> Kunderna är nöjda.",
  "",
  "Läs mer på [vår sajt](https://jjbyggboden.se).",
].join("\n");

// Så här ser dokumentet ut i editorn när ovanstående lästs in (motsvarar
// markdownToHtml -> tiptap). Serialiseringen tillbaka ska ge exakt samma text.
const parsedInEditor: RichNode = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [text("Nytt tak i Boden")] },
    paragraph(
      text("Vi har lagt "),
      text("nytt tak", { type: "bold" }),
      text(" på en villa i "),
      text("Boden", { type: "italic" }),
      text(".")
    ),
    {
      type: "bulletList",
      content: [
        { type: "listItem", content: [paragraph(text("Rivning av gammalt tak"))] },
        { type: "listItem", content: [paragraph(text("Ny läkt och papp"))] },
      ],
    },
    {
      type: "orderedList",
      content: [
        { type: "listItem", content: [paragraph(text("Offert"))] },
        { type: "listItem", content: [paragraph(text("Utförande"))] },
      ],
    },
    { type: "blockquote", content: [paragraph(text("Kunderna är nöjda."))] },
    paragraph(
      text("Läs mer på "),
      text("vår sajt", { type: "link", attrs: { href: "https://jjbyggboden.se" } }),
      text(".")
    ),
  ],
};

check("full runda: markdown -> editor -> markdown", richDocToMarkdown(parsedInEditor), stored);

check(
  "full runda: HTML för kundsajten",
  markdownToHtml(stored),
  "<h2>Nytt tak i Boden</h2>" +
    "<p>Vi har lagt <strong>nytt tak</strong> på en villa i <em>Boden</em>.</p>" +
    "<ul><li>Rivning av gammalt tak</li><li>Ny läkt och papp</li></ul>" +
    "<ol><li>Offert</li><li>Utförande</li></ol>" +
    "<blockquote><p>Kunderna är nöjda.</p></blockquote>" +
    '<p>Läs mer på <a href="https://jjbyggboden.se">vår sajt</a>.</p>'
);

check(
  "ren text ur markdown",
  markdownToPlainText(stored),
  "Nytt tak i Boden Vi har lagt nytt tak på en villa i Boden. Rivning av gammalt tak Ny läkt och papp Offert Utförande Kunderna är nöjda. Läs mer på vår sajt."
);

if (failures > 0) {
  console.error(`\n${failures} test misslyckades.`);
  process.exit(1);
}

console.log("\nAlla markdown-test gick igenom.");
