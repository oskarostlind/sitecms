/**
 * Validerar guider: npx tsx scripts/check-guides.ts [slug ...]
 * Utan argument kontrolleras alla filer i lib/guides/content/.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Guide } from "../lib/guides/types";
import { wordCount } from "../lib/guides/text";

const WAVE_SLUGS = [
  "andra-text-pa-hemsidan",
  "andra-hemsida-byggd-i-nextjs",
  "uppdatera-priser-pa-hemsidan",
  "byta-bild-pa-hemsidan",
  "andra-oppettider-pa-hemsidan",
  "lagga-upp-nyheter-pa-hemsidan",
  "lagga-till-tjanst-pa-hemsidan",
  "vad-kostar-en-textandring",
  "lat-kunden-redigera-nextjs",
  "overlamna-hemsida-till-kund",
];

const dir = join(process.cwd(), "lib/guides/content");
const wanted = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => f.endsWith(".ts") && f !== "index.ts");
let failed = 0;

async function main() {
for (const file of files) {
  const slug = file.replace(/\.ts$/, "");
  if (wanted.length && !wanted.includes(slug)) continue;
  const mod = (await import(pathToFileURL(join(dir, file)).href)) as { default?: Guide };
  const g = mod.default;
  const problems: string[] = [];
  const warn: string[] = [];
  if (!g) {
    console.log(`✖ ${file}: saknar default-export`);
    failed++;
    continue;
  }
  if (g.slug !== slug) problems.push(`slug "${g.slug}" matchar inte filnamnet`);
  if (!/^[a-z0-9-]+$/.test(g.slug)) problems.push("slug får bara innehålla a–z, 0–9 och -");
  if ((g.title + " | sitecms").length > 60) problems.push(`title + suffix = ${(g.title + " | sitecms").length} tecken (max 60)`);
  if (g.description.length < 110 || g.description.length > 160)
    problems.push(`description är ${g.description.length} tecken (110–160)`);
  if (!g.intro.length) problems.push("intro saknas");
  if (g.sections.length < 4) problems.push(`bara ${g.sections.length} avsnitt (minst 4)`);
  const ids = g.sections.map((s) => s.id);
  if (new Set(ids).size !== ids.length) problems.push("avsnitts-id är inte unika");
  for (const id of ids) if (!/^[a-z0-9-]+$/.test(id)) problems.push(`ogiltigt avsnitts-id "${id}"`);
  if (g.faq.length < 4) problems.push(`bara ${g.faq.length} FAQ (minst 4)`);
  if (g.related.length < 2) problems.push("minst 2 relaterade guider");
  for (const r of g.related) if (!WAVE_SLUGS.includes(r)) problems.push(`okänd relaterad slug "${r}"`);
  const words = wordCount(g);
  if (words < 750) problems.push(`${words} ord (minst 750)`);
  if (words > 2200) warn.push(`${words} ord (lång – stäm av att allt behövs)`);
  const text = JSON.stringify(g);
  const internal = (text.match(/\]\(\/(guider|docs|signup)[^)]*\)/g) ?? []).length;
  if (internal < 3) problems.push(`bara ${internal} interna länkar i texten (minst 3)`);
  for (const m of text.matchAll(/\]\(\/guider\/([a-z0-9-]+)/g))
    if (!WAVE_SLUGS.includes(m[1])) problems.push(`länk till okänd guide /guider/${m[1]}`);
  const tables = g.sections.flatMap((s) => s.blocks).filter((b) => b.type === "table").length;
  if (tables < 1) problems.push("minst en tabell");
  if (/—/.test(text) && (text.match(/—/g) ?? []).length > 12) warn.push("många tankstreck (—) – variera");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(g.modified)) problems.push("modified ska vara YYYY-MM-DD");

  if (problems.length) {
    failed++;
    console.log(`✖ ${slug} (${words} ord)`);
    for (const p of problems) console.log(`   • ${p}`);
  } else {
    console.log(`✔ ${slug} — ${words} ord, ${g.sections.length} avsnitt, ${g.faq.length} FAQ, ${tables} tabell(er)`);
  }
  for (const w of warn) console.log(`   ⚠ ${w}`);
}
}

main().then(() => process.exit(failed ? 1 : 0));
