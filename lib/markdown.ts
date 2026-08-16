/**
 * Bryggan mellan markdown (lagringsformatet i databasen) och rich text.
 *
 * Varför den finns: kunderna redigerar numera i en WYSIWYG-editor
 * (components/admin/RichTextEditor.tsx) men innehållet fortsätter att sparas
 * som markdown i `blocks.value` och `posts.body`. Det gör att befintligt
 * innehåll, seed-skript och kundsajter som redan läser fälten fungerar
 * oförändrat — ingen migrering av innehåll behövs.
 *
 * Två riktningar:
 *   markdownToHtml()     markdown -> HTML   (fyller editorn, förhandsgranskning, API:ts `html`)
 *   richDocToMarkdown()  editorns JSON -> markdown (det som sparas)
 *
 * Stödd delmängd: rubriker (h2/h3), fet, kursiv, länkar, punktlista,
 * numrerad lista, citat och radbrytning. Delmängden matchar exakt vad
 * verktygsraden i editorn kan skapa, så en runda markdown -> editor ->
 * markdown ger tillbaka samma innehåll.
 *
 * All HTML som produceras här byggs av escapad text plus vår egen taggupp-
 * sättning, så utdata är säker att rendera med dangerouslySetInnerHTML.
 */

// ---------------------------------------------------------------------------
// Delade typer (editorns dokument, utan att importera tiptap på servern)
// ---------------------------------------------------------------------------

export type RichMark = {
  type?: string;
  attrs?: Record<string, unknown> | null;
};

export type RichNode = {
  type?: string;
  attrs?: Record<string, unknown> | null;
  content?: RichNode[];
  marks?: RichMark[] | null;
  text?: string;
};

// ---------------------------------------------------------------------------
// markdown -> HTML
// ---------------------------------------------------------------------------

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/**
 * Släpper bara igenom länkmål som är säkra att rendera. Allt annat
 * (javascript:, data: ...) returnerar null och länken faller tillbaka till
 * ren text.
 */
function safeUrl(raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;
  if (/^(https?:\/\/|mailto:|tel:|\/|#|\.\/)/i.test(url)) return url;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url)) return `mailto:${url}`;
  if (/^www\./i.test(url)) return `https://${url}`;
  return null;
}

function renderEmphasis(text: string): string {
  return text
    .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, "<strong>$1</strong>")
    .replace(/__(?=\S)([\s\S]*?\S)__/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*(?=\S)([^*]*?\S)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/(^|[^_\w])_(?=\S)([^_]*?\S)_(?![\w_])/g, "$1<em>$2</em>");
}

const LINK_PATTERN = /\[([^\]\n]*)\]\(([^)\s]+)\)/g;

/** Escapar texten och renderar länkar, fet och kursiv stil. */
function renderInline(text: string): string {
  const escaped = escapeHtml(text);
  let out = "";
  let cursor = 0;

  LINK_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = LINK_PATTERN.exec(escaped)) !== null) {
    out += renderEmphasis(escaped.slice(cursor, match.index));
    const href = safeUrl(match[2]);
    out += href
      ? `<a href="${href}">${renderEmphasis(match[1])}</a>`
      : renderEmphasis(match[0]);
    cursor = match.index + match[0].length;
  }

  return out + renderEmphasis(escaped.slice(cursor));
}

type ListLine = { indent: number; ordered: boolean; text: string };

const BULLET_PATTERN = /^(\s*)([-*+])\s+(.*)$/;
const ORDERED_PATTERN = /^(\s*)(\d+)[.)]\s+(.*)$/;
const HEADING_PATTERN = /^(#{1,6})\s+(.*)$/;
const QUOTE_PATTERN = /^>\s?(.*)$/;

/**
 * Bygger nästlade <ul>/<ol> ur en platt lista av rader. Returnerar HTML plus
 * index för första raden som inte hörde till listan.
 */
function buildList(lines: ListLine[], start: number, indent: number): [string, number] {
  const ordered = lines[start].ordered;
  const parts: string[] = [];
  let index = start;

  while (index < lines.length) {
    const line = lines[index];

    if (line.indent < indent) break;

    if (line.indent > indent) {
      const [nested, next] = buildList(lines, index, line.indent);
      if (parts.length > 0) {
        // Nästlade listan hör hemma inuti föregående punkt.
        parts[parts.length - 1] = parts[parts.length - 1].replace(
          /<\/li>$/,
          `${nested}</li>`
        );
      } else {
        parts.push(`<li>${nested}</li>`);
      }
      index = next;
      continue;
    }

    if (line.ordered !== ordered) break;

    parts.push(`<li>${renderInline(line.text)}</li>`);
    index += 1;
  }

  const tag = ordered ? "ol" : "ul";
  return [`<${tag}>${parts.join("")}</${tag}>`, index];
}

/** Konverterar markdown till HTML för editorn, förhandsgranskningen och API:t. */
export function markdownToHtml(markdown: string | null | undefined): string {
  if (!markdown || !markdown.trim()) return "";

  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const html: string[] = [];

  let paragraph: string[] = [];
  let quote: string[] = [];
  let list: ListLine[] = [];

  function flushParagraph() {
    if (paragraph.length === 0) return;
    html.push(`<p>${paragraph.map(renderInline).join("<br />")}</p>`);
    paragraph = [];
  }

  function flushQuote() {
    if (quote.length === 0) return;
    html.push(`<blockquote><p>${quote.map(renderInline).join("<br />")}</p></blockquote>`);
    quote = [];
  }

  function flushList() {
    if (list.length === 0) return;
    const [markup] = buildList(list, 0, list[0].indent);
    html.push(markup);
    list = [];
  }

  function flushAll() {
    flushParagraph();
    flushQuote();
    flushList();
  }

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, "");

    if (!line.trim()) {
      flushAll();
      continue;
    }

    const heading = HEADING_PATTERN.exec(line);
    if (heading) {
      flushAll();
      // Editorn erbjuder rubrik (h2) och underrubrik (h3). Djupare nivåer i
      // äldre innehåll landar på h3; h1 reserveras för sidans egen titel.
      const level = heading[1].length >= 3 ? 3 : 2;
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      flushAll();
      html.push("<hr />");
      continue;
    }

    const quoteLine = QUOTE_PATTERN.exec(line);
    if (quoteLine) {
      flushParagraph();
      flushList();
      quote.push(quoteLine[1]);
      continue;
    }

    const bullet = BULLET_PATTERN.exec(line);
    if (bullet) {
      flushParagraph();
      flushQuote();
      list.push({ indent: bullet[1].length, ordered: false, text: bullet[3] });
      continue;
    }

    const ordered = ORDERED_PATTERN.exec(line);
    if (ordered) {
      flushParagraph();
      flushQuote();
      list.push({ indent: ordered[1].length, ordered: true, text: ordered[3] });
      continue;
    }

    flushQuote();
    flushList();
    paragraph.push(line);
  }

  flushAll();

  return html.join("");
}

// ---------------------------------------------------------------------------
// editorns JSON -> markdown
// ---------------------------------------------------------------------------

/**
 * Escapar tecken som annars skulle tolkas som markdown-syntax nästa gång
 * texten läses in. Medvetet snålt tilltaget: kundsajter som visar värdet rått
 * ska inte plötsligt fyllas med bakstreck.
 */
function escapeMarkdown(text: string): string {
  return text
    .replace(/([\\*[\]])/g, "\\$1")
    .replace(/^(\s*)([#>])/gm, "$1\\$2")
    .replace(/^(\s*)([-+])(\s)/gm, "$1\\$2$3")
    .replace(/^(\s*)(\d+)([.)]\s)/gm, "$1$2\\$3");
}

function markType(mark: RichMark): string {
  return typeof mark.type === "string" ? mark.type : "";
}

function inlineToMarkdown(nodes: RichNode[] | undefined): string {
  if (!nodes || nodes.length === 0) return "";

  return nodes
    .map((node) => {
      if (node.type === "hardBreak") return "\n";
      if (node.type !== "text" || typeof node.text !== "string") {
        // Okänd inline-nod: ta med eventuellt textinnehåll hellre än att tappa det.
        return inlineToMarkdown(node.content);
      }

      let text = escapeMarkdown(node.text);
      const marks = node.marks ?? [];

      if (marks.some((mark) => markType(mark) === "code")) {
        text = `\`${node.text}\``;
      }
      if (marks.some((mark) => markType(mark) === "bold" || markType(mark) === "strong")) {
        text = `**${text}**`;
      }
      if (marks.some((mark) => markType(mark) === "italic" || markType(mark) === "em")) {
        text = `*${text}*`;
      }

      const link = marks.find((mark) => markType(mark) === "link");
      if (link) {
        const href = typeof link.attrs?.href === "string" ? link.attrs.href : "";
        if (href) text = `[${text}](${href})`;
      }

      return text;
    })
    .join("");
}

function listItemToMarkdown(item: RichNode, marker: string): string {
  // Blocken i en punkt separeras med enkel radbrytning så att en nästlad
  // lista stannar kvar i samma punkt vid inläsning.
  const inner = (item.content ?? [])
    .map((child) => blockToMarkdown(child))
    .filter((part) => part.length > 0)
    .join("\n");

  const padding = " ".repeat(marker.length);

  return inner
    .split("\n")
    .map((line, index) => (index === 0 ? marker + line : line ? padding + line : ""))
    .join("\n");
}

function blockToMarkdown(node: RichNode): string {
  switch (node.type) {
    case "paragraph":
      return inlineToMarkdown(node.content);

    case "heading": {
      const level = typeof node.attrs?.level === "number" ? node.attrs.level : 2;
      return `${level >= 3 ? "###" : "##"} ${inlineToMarkdown(node.content)}`;
    }

    case "bulletList":
      return (node.content ?? [])
        .map((item) => listItemToMarkdown(item, "- "))
        .join("\n");

    case "orderedList":
      return (node.content ?? [])
        .map((item, index) => listItemToMarkdown(item, `${index + 1}. `))
        .join("\n");

    case "blockquote":
      return blocksToMarkdown(node.content ?? [])
        .split("\n")
        .map((line) => (line ? `> ${line}` : ">"))
        .join("\n");

    case "horizontalRule":
      return "---";

    case "hardBreak":
      return "";

    default:
      return node.content ? blocksToMarkdown(node.content) : "";
  }
}

function blocksToMarkdown(nodes: RichNode[]): string {
  return nodes
    .map(blockToMarkdown)
    .filter((block) => block.trim().length > 0)
    .join("\n\n");
}

/** Serialiserar editorns dokument (editor.getJSON()) till markdown. */
export function richDocToMarkdown(doc: RichNode | null | undefined): string {
  if (!doc?.content) return "";
  return blocksToMarkdown(doc.content).trim();
}

/**
 * Kort textutdrag ur markdown — används där en ren förhandstitt behövs
 * (listor, aktivitetslogg) utan att visa markdown-tecken.
 */
export function markdownToPlainText(markdown: string | null | undefined): string {
  if (!markdown) return "";
  return markdown
    .replace(/\r\n?/g, "\n")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*([-*+]|\d+[.)])\s+/gm, "")
    .replace(/\[([^\]\n]*)\]\([^)\s]+\)/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/\\([\\*[\]#>-])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
