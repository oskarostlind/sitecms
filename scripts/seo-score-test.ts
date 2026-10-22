import assert from "node:assert/strict";
import {
  countWords,
  normalizeSlug,
  scoreContent,
  type ContentInput,
  type ContentPageInput,
  type ContentPostInput,
  type ContentSeoMetaInput,
} from "../lib/seo-score/content";
import { combineScore, lighthouseSubScore } from "../lib/seo-score/combine";
import { pageSpeedUrl, parsePageSpeed } from "../lib/seo-score/pagespeed";

const NOW = new Date("2026-10-22T12:00:00.000Z");

// --- hjälpare för testdata ---------------------------------------------------

const LONG_TEXT = Array.from({ length: 320 }, (_, i) => `ord${i}`).join(" ");

function page(id: string, slug: string, extra: Partial<ContentPageInput> = {}): ContentPageInput {
  return {
    id,
    slug,
    title: slug || "Start",
    blocks: [{ pageId: id, type: "richtext", value: LONG_TEXT, alt: null }],
    ...extra,
  };
}

function meta(id: string, pageSlug: string, extra: Partial<ContentSeoMetaInput> = {}): ContentSeoMetaInput {
  return {
    id,
    pageSlug,
    title: `En lagom lång SEO-titel för ${pageSlug || "start"} AB`,
    description:
      `En beskrivning för ${pageSlug || "startsidan"} som är tillräckligt lång för att inte flaggas av regeln om längd.`,
    ogImage: "https://example.se/og.png",
    ...extra,
  };
}

function post(id: string, extra: Partial<ContentPostInput> = {}): ContentPostInput {
  return {
    id,
    published: true,
    publishedAt: new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000),
    coverImage: "https://example.se/cover.jpg",
    coverImageAlt: "Grävmaskin på tomt",
    ...extra,
  };
}

function perfectSite(): ContentInput {
  return {
    pages: [page("p1", ""), page("p2", "om-oss"), page("p3", "tjanster")],
    seoMeta: [meta("m1", ""), meta("m2", "om-oss"), meta("m3", "tjanster")],
    posts: [post("a1"), post("a2", { coverImage: null })],
    now: NOW,
  };
}

function findingIds(input: ContentInput): string[] {
  return scoreContent(input).findings.map((f) => f.id);
}

function finding(input: ContentInput, id: string) {
  const hit = scoreContent(input).findings.find((f) => f.id === id);
  assert.ok(hit, `förväntade fyndet ${id}`);
  return hit;
}

// --- perfekt sajt = 100 -------------------------------------------------------

{
  const result = scoreContent(perfectSite());
  assert.equal(result.score, 100, JSON.stringify(result.findings));
  assert.deepEqual(result.findings, []);
  assert.equal(result.checkedAt, NOW.toISOString());
}

// --- tom sajt -----------------------------------------------------------------

{
  const result = scoreContent({ pages: [], seoMeta: [], posts: [], now: NOW });
  assert.deepEqual(
    result.findings.map((f) => f.id),
    ["posts.none"],
  );
  assert.equal(result.score, 97);
  assert.equal(result.findings[0].severity, "low");
  assert.equal(result.findings[0].href, "/posts/new");
}

// --- seo.title.missing: poäng, tak, singular/plural, href ---------------------

{
  const one = perfectSite();
  one.seoMeta[1] = meta("m2", "om-oss", { title: "   " });
  const hit = finding(one, "seo.title.missing");
  assert.equal(hit.title, "1 sida saknar SEO-titel");
  assert.equal(hit.points, 6);
  assert.equal(hit.count, 1);
  assert.equal(hit.severity, "high");
  assert.equal(hit.href, "/seo/m2");

  const many = perfectSite();
  many.seoMeta = many.seoMeta.map((m) => ({ ...m, title: null }));
  many.seoMeta.push(meta("m4", "kontakt", { title: "" }));
  many.pages.push(page("p4", "kontakt"));
  const hitMany = finding(many, "seo.title.missing");
  assert.equal(hitMany.title, "4 sidor saknar SEO-titel");
  assert.equal(hitMany.points, 18, "taket är 18");
  assert.equal(hitMany.href, "/seo");
}

// --- seo.title.length ---------------------------------------------------------

{
  const input = perfectSite();
  input.seoMeta[0] = meta("m1", "", { title: "Kort" });
  const hit = finding(input, "seo.title.length");
  assert.equal(hit.title, "1 sida har en SEO-titel med fel längd");
  assert.equal(hit.points, 2);
  assert.equal(hit.severity, "medium");
  assert.equal(hit.href, "/seo/m1");

  const many = perfectSite();
  many.seoMeta = many.seoMeta.map((m, i) => ({ ...m, title: `${"x".repeat(61)} ${i}` }));
  for (let i = 0; i < 3; i++) {
    many.pages.push(page(`px${i}`, `sida-${i}`));
    many.seoMeta.push(meta(`mx${i}`, `sida-${i}`, { title: "För kort" }));
  }
  const hitMany = finding(many, "seo.title.length");
  assert.equal(hitMany.title, "6 sidor har SEO-titlar med fel längd");
  assert.equal(hitMany.points, 8, "taket är 8");
  assert.equal(hitMany.href, "/seo");

  // Exakt 30 och 60 tecken är OK.
  const edge = perfectSite();
  edge.seoMeta[0] = meta("m1", "", { title: "a".repeat(30) });
  edge.seoMeta[1] = meta("m2", "om-oss", { title: "b".repeat(60) });
  assert.ok(!findingIds(edge).includes("seo.title.length"));
}

// --- seo.description.missing / length -----------------------------------------

{
  const input = perfectSite();
  input.seoMeta[2] = meta("m3", "tjanster", { description: null });
  const hit = finding(input, "seo.description.missing");
  assert.equal(hit.title, "1 sida saknar SEO-beskrivning");
  assert.equal(hit.points, 6);
  assert.equal(hit.href, "/seo");

  const many = perfectSite();
  many.seoMeta = many.seoMeta.map((m) => ({ ...m, description: "" }));
  many.pages.push(page("p4", "kontakt"));
  many.seoMeta.push(meta("m4", "kontakt", { description: "  " }));
  const hitMany = finding(many, "seo.description.missing");
  assert.equal(hitMany.title, "4 sidor saknar SEO-beskrivning");
  assert.equal(hitMany.points, 18);

  const short = perfectSite();
  short.seoMeta[1] = meta("m2", "om-oss", { description: "För kort beskrivning." });
  const hitShort = finding(short, "seo.description.length");
  assert.equal(hitShort.title, "1 sida har en SEO-beskrivning med fel längd");
  assert.equal(hitShort.points, 2);
  assert.equal(hitShort.href, "/seo/m2");

  const long = perfectSite();
  long.seoMeta = long.seoMeta.map((m) => ({ ...m, description: "x".repeat(156) }));
  for (let i = 0; i < 3; i++) {
    long.pages.push(page(`py${i}`, `annan-${i}`));
    long.seoMeta.push(meta(`my${i}`, `annan-${i}`, { description: "x".repeat(69) }));
  }
  const hitLong = finding(long, "seo.description.length");
  assert.equal(hitLong.title, "6 sidor har SEO-beskrivningar med fel längd");
  assert.equal(hitLong.points, 8, "taket är 8");

  const edge = perfectSite();
  edge.seoMeta[0] = meta("m1", "", { description: "a".repeat(70) });
  edge.seoMeta[1] = meta("m2", "om-oss", { description: "b".repeat(155) });
  assert.ok(!findingIds(edge).includes("seo.description.length"));
}

// --- seo.title.duplicate ------------------------------------------------------

{
  const input = perfectSite();
  input.seoMeta[1] = meta("m2", "om-oss", { title: input.seoMeta[0].title });
  const hit = finding(input, "seo.title.duplicate");
  assert.equal(hit.title, "1 sida har samma SEO-titel som en annan sida");
  assert.equal(hit.points, 4);
  assert.equal(hit.severity, "medium");
  assert.equal(hit.href, "/seo");

  // Tre sidor med samma titel = 2 dubbletter; fyra = 3 → tak 8.
  const many = perfectSite();
  many.pages.push(page("p4", "kontakt"));
  many.seoMeta.push(meta("m4", "kontakt"));
  many.seoMeta = many.seoMeta.map((m) => ({ ...m, title: "  Samma titel på varenda sida AB " }));
  const hitMany = finding(many, "seo.title.duplicate");
  assert.equal(hitMany.count, 3);
  assert.equal(hitMany.title, "3 sidor har samma SEO-titel som andra sidor");
  assert.equal(hitMany.points, 8, "taket är 8");

  // Tomma titlar räknas inte som dubbletter av varandra.
  const empty = perfectSite();
  empty.seoMeta = empty.seoMeta.map((m) => ({ ...m, title: "" }));
  assert.ok(!findingIds(empty).includes("seo.title.duplicate"));
}

// --- seo.pages.uncovered ------------------------------------------------------

{
  const input = perfectSite();
  input.pages.push(page("p4", "kontakt"));
  const hit = finding(input, "seo.pages.uncovered");
  assert.equal(hit.title, "1 sida saknar SEO-inställningar");
  assert.equal(hit.points, 4);
  assert.equal(hit.severity, "high");
  assert.equal(hit.href, "/seo");

  const many = perfectSite();
  many.seoMeta = [];
  many.pages.push(page("p4", "kontakt"));
  const hitMany = finding(many, "seo.pages.uncovered");
  assert.equal(hitMany.title, "4 sidor saknar SEO-inställningar");
  assert.equal(hitMany.points, 12, "taket är 12");

  // Startsidans slug-varianter matchar varandra, och "/Om-oss/" matchar "om-oss".
  const variants = perfectSite();
  variants.pages[0] = page("p1", "home");
  variants.pages[1] = page("p2", "/Om-oss/");
  variants.seoMeta[0] = meta("m1", "/");
  assert.ok(!findingIds(variants).includes("seo.pages.uncovered"), JSON.stringify(findingIds(variants)));
  assert.equal(normalizeSlug("start"), "");
  assert.equal(normalizeSlug("/Tjanster/"), "tjanster");
}

// --- seo.ogimage.missing ------------------------------------------------------

{
  const input = perfectSite();
  input.seoMeta[0] = meta("m1", "", { ogImage: "" });
  const hit = finding(input, "seo.ogimage.missing");
  assert.equal(hit.title, "Startsidan saknar delningsbild (og-bild)");
  assert.equal(hit.points, 4);
  assert.equal(hit.severity, "low");
  assert.equal(hit.href, "/seo/m1");

  // Startsidan som "home" räknas också som startsida.
  const home = perfectSite();
  home.seoMeta[0] = meta("m1", "home", { ogImage: null });
  assert.ok(findingIds(home).includes("seo.ogimage.missing"));

  // Undersidor utan og-bild flaggas inte.
  const sub = perfectSite();
  sub.seoMeta[1] = meta("m2", "om-oss", { ogImage: null });
  assert.ok(!findingIds(sub).includes("seo.ogimage.missing"));
}

// --- images.alt.missing -------------------------------------------------------

{
  const input = perfectSite();
  input.pages[1].blocks.push({ pageId: "p2", type: "image", value: "https://x.se/a.jpg", alt: "  " });
  const hit = finding(input, "images.alt.missing");
  assert.equal(hit.title, "1 bild saknar beskrivning (alt-text)");
  assert.equal(hit.points, 2);
  assert.equal(hit.severity, "high");
  assert.equal(hit.href, "/pages/p2");

  // Bildblock utan värde räknas inte (samma villkor som översikten).
  const noValue = perfectSite();
  noValue.pages[1].blocks.push({ pageId: "p2", type: "image", value: "", alt: null });
  assert.ok(!findingIds(noValue).includes("images.alt.missing"));

  const many = perfectSite();
  for (let i = 0; i < 4; i++) {
    many.pages[0].blocks.push({ pageId: "p1", type: "image", value: `https://x.se/${i}.jpg`, alt: null });
    many.pages[2].blocks.push({ pageId: "p3", type: "image", value: `https://x.se/b${i}.jpg`, alt: null });
  }
  const hitMany = finding(many, "images.alt.missing");
  assert.equal(hitMany.title, "8 bilder saknar beskrivning (alt-text)");
  assert.equal(hitMany.points, 12, "taket är 12");
  assert.equal(hitMany.href, "/pages");
}

// --- posts.cover.alt.missing --------------------------------------------------

{
  const input = perfectSite();
  input.posts[0] = post("a1", { coverImageAlt: "" });
  const hit = finding(input, "posts.cover.alt.missing");
  assert.equal(hit.title, "1 inlägg har en omslagsbild utan alt-text");
  assert.equal(hit.points, 1);
  assert.equal(hit.severity, "low");
  assert.equal(hit.href, "/posts/a1");

  // Utkast räknas inte.
  const draft = perfectSite();
  draft.posts[0] = post("a1", { published: false, coverImageAlt: null });
  assert.ok(!findingIds(draft).includes("posts.cover.alt.missing"));

  const many = perfectSite();
  many.posts = Array.from({ length: 6 }, (_, i) => post(`a${i}`, { coverImageAlt: null }));
  const hitMany = finding(many, "posts.cover.alt.missing");
  assert.equal(hitMany.title, "6 inlägg har omslagsbilder utan alt-text");
  assert.equal(hitMany.points, 4, "taket är 4");
  assert.equal(hitMany.href, "/posts");
}

// --- content.thin -------------------------------------------------------------

{
  const input = perfectSite();
  input.pages[2] = page("p3", "tjanster", {
    blocks: [{ pageId: "p3", type: "richtext", value: "## Rubrik\n\nBara **några** få ord här.", alt: null }],
  });
  const hit = finding(input, "content.thin");
  assert.equal(hit.title, "1 sida har lite text (under 300 ord)");
  assert.equal(hit.points, 3);
  assert.equal(hit.severity, "medium");
  assert.equal(hit.href, "/pages/p3");

  // Fyra tunna sidor → tak 9.
  const many = perfectSite();
  many.pages = many.pages.map((p) => ({ ...p, blocks: [{ pageId: p.id, type: "text", value: "Kort.", alt: null }] }));
  many.pages.push(page("p4", "kontakt", { blocks: [] }));
  many.seoMeta.push(meta("m4", "kontakt"));
  const hitMany = finding(many, "content.thin");
  assert.equal(hitMany.title, "4 sidor har lite text (under 300 ord)");
  assert.equal(hitMany.points, 9, "taket är 9");
  assert.equal(hitMany.href, "/pages");

  // Ordräkning strippar markdown och HTML; bildblock räknas inte.
  assert.equal(countWords("## Rubrik\n\n- **Fet** punkt\n- [länk](https://x.se) här"), 5);
  assert.equal(countWords("<p>Tre <strong>ord</strong> här</p>"), 3);
  assert.equal(countWords("--- *** ###"), 0);
  assert.equal(countWords(null), 0);
  const split = perfectSite();
  split.pages[0] = page("p1", "", {
    blocks: [
      { pageId: "p1", type: "text", value: Array.from({ length: 150 }, () => "ord").join(" "), alt: null },
      { pageId: "p1", type: "richtext", value: Array.from({ length: 150 }, () => "ord").join(" "), alt: null },
      { pageId: "p1", type: "image", value: Array.from({ length: 500 }, () => "ord").join(" "), alt: "x" },
    ],
  });
  assert.ok(!findingIds(split).includes("content.thin"), "150 + 150 ord räcker");
  split.pages[0].blocks[1].value = Array.from({ length: 149 }, () => "ord").join(" ");
  assert.ok(findingIds(split).includes("content.thin"), "299 ord är tunt");
}

// --- posts.stale / posts.none -------------------------------------------------

{
  const stale = perfectSite();
  stale.posts = [post("a1", { publishedAt: new Date(NOW.getTime() - 91 * 24 * 60 * 60 * 1000) })];
  const hit = finding(stale, "posts.stale");
  assert.equal(hit.title, "Inget inlägg publicerat de senaste 90 dagarna");
  assert.equal(hit.points, 5);
  assert.equal(hit.severity, "low");
  assert.equal(hit.href, "/posts/new");
  assert.ok(!findingIds(stale).includes("posts.none"));

  // Bara utkast = inlägg finns men inget publicerat → stale, inte none.
  const drafts = perfectSite();
  drafts.posts = [post("a1", { published: false })];
  assert.ok(findingIds(drafts).includes("posts.stale"));
  assert.ok(!findingIds(drafts).includes("posts.none"));

  // 89 dagar gammalt är fortfarande färskt; publishedAt som ISO-sträng funkar.
  const fresh = perfectSite();
  fresh.posts = [post("a1", { publishedAt: new Date(NOW.getTime() - 89 * 24 * 60 * 60 * 1000).toISOString() })];
  assert.ok(!findingIds(fresh).includes("posts.stale"));

  const none = perfectSite();
  none.posts = [];
  assert.ok(findingIds(none).includes("posts.none"));
  assert.ok(!findingIds(none).includes("posts.stale"));
}

// --- sortering, golv och alla regler på en gång -------------------------------

{
  const worst: ContentInput = {
    pages: [
      page("p1", "", { blocks: [{ pageId: "p1", type: "image", value: "https://x.se/1.jpg", alt: null }] }),
      page("p2", "om-oss", { blocks: [] }),
      page("p3", "tjanster", { blocks: [] }),
      page("p4", "kontakt", { blocks: [] }),
      page("p5", "referenser", { blocks: [] }),
    ],
    seoMeta: [
      meta("m1", "", { title: "Kort", description: "Kort", ogImage: null }),
      meta("m2", "om-oss", { title: "Kort", description: "Kort" }),
      meta("m3", "tjanster", { title: null, description: null }),
    ],
    posts: [post("a1", { publishedAt: new Date("2020-01-01"), coverImageAlt: null })],
    now: NOW,
  };
  const result = scoreContent(worst);
  const ids = result.findings.map((f) => f.id);
  for (const id of [
    "seo.title.missing",
    "seo.title.length",
    "seo.description.missing",
    "seo.description.length",
    "seo.title.duplicate",
    "seo.pages.uncovered",
    "seo.ogimage.missing",
    "images.alt.missing",
    "posts.cover.alt.missing",
    "content.thin",
    "posts.stale",
  ]) {
    assert.ok(ids.includes(id), `saknar ${id}`);
  }
  assert.ok(!ids.includes("posts.none"));
  const points = result.findings.map((f) => f.points);
  assert.deepEqual(points, [...points].sort((a, b) => b - a), "sorterade på points fallande");
  // 6 + 4 + 6 + 4 + 4 + 8 + 4 + 2 + 1 + 9 + 5 = 53 → 47
  assert.equal(result.score, 47);

  // Golv 0: nästan varje regel i taket (18+8+18+8+8+12+4+12+1+9+5 = 103).
  const floor: ContentInput = {
    pages: Array.from({ length: 3 }, (_, i) =>
      page(`p${i}`, `a${i}`, {
        blocks: [
          { pageId: `p${i}`, type: "image", value: `https://x.se/${i}-1.jpg`, alt: null },
          { pageId: `p${i}`, type: "image", value: `https://x.se/${i}-2.jpg`, alt: null },
        ],
      }),
    ),
    seoMeta: [
      meta("m0", "", { title: "Kort", description: "Kort", ogImage: null }),
      ...Array.from({ length: 3 }, (_, i) => meta(`mk${i}`, `x${i}`, { title: "Kort", description: "Kort" })),
      ...Array.from({ length: 3 }, (_, i) => meta(`mn${i}`, `y${i}`, { title: null, description: null })),
    ],
    posts: [post("old", { publishedAt: new Date("2019-05-01"), coverImageAlt: null })],
    now: NOW,
  };
  const floored = scoreContent(floor);
  const total = floored.findings.reduce((s, f) => s + f.points, 0);
  assert.equal(total, 103, JSON.stringify(floored.findings.map((f) => [f.id, f.points])));
  assert.equal(floored.score, 0, "golvet är 0, aldrig negativt");
}

// --- combineScore / lighthouseSubScore ----------------------------------------

assert.equal(combineScore(80, null, null), 80);
assert.equal(combineScore(80, 50, null), 68);
assert.equal(combineScore(100, 100, null), 100);
assert.equal(combineScore(0, 0, null), 0);
assert.equal(combineScore(75, 90, null), 81); // 45 + 36
assert.equal(combineScore(73, 61, null), 68); // 43.8 + 24.4 = 68.2
assert.equal(combineScore(90, 50, 10), 74, "tech räknas inte in");
assert.equal(combineScore(150, null, null), 100, "klämms till 100");
assert.equal(combineScore(-5, null, null), 0, "klämms till 0");

assert.equal(lighthouseSubScore({ seo: 100, performance: 100, accessibility: 100 }), 100);
assert.equal(lighthouseSubScore({ seo: 90, performance: 60, accessibility: 80 }), 79); // 45 + 18 + 16
assert.equal(lighthouseSubScore({ seo: 85, performance: 43, accessibility: 97 }), 75); // 42.5 + 12.9 + 19.4 = 74.8

// --- PageSpeed: URL och parsning (ingen nätverk) -------------------------------

{
  const url = new URL(pageSpeedUrl("https://firma.se", "nyckel"));
  assert.equal(url.origin + url.pathname, "https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  assert.equal(url.searchParams.get("url"), "https://firma.se");
  assert.equal(url.searchParams.get("strategy"), "mobile");
  assert.deepEqual(url.searchParams.getAll("category"), ["PERFORMANCE", "SEO", "ACCESSIBILITY", "BEST_PRACTICES"]);
  assert.equal(url.searchParams.get("key"), "nyckel");
  assert.equal(new URL(pageSpeedUrl("https://firma.se")).searchParams.has("key"), false);

  const parsed = parsePageSpeed(
    {
      lighthouseResult: {
        categories: {
          performance: { score: 0.634 },
          seo: { score: 0.92 },
          accessibility: { score: 0.885 },
          "best-practices": { score: 1 },
        },
        audits: {
          "largest-contentful-paint": { numericValue: 2345.6 },
          "cumulative-layout-shift": { numericValue: 0.012 },
        },
      },
    },
    "https://firma.se",
    NOW,
  );
  assert.ok(parsed);
  assert.equal(parsed.performance, 63);
  assert.equal(parsed.seo, 92);
  assert.equal(parsed.accessibility, 89);
  assert.equal(parsed.bestPractices, 100);
  assert.equal(parsed.lcpMs, 2346);
  assert.equal(parsed.cls, 0.012);
  assert.equal(parsed.inpMs, null);
  assert.equal(parsed.strategy, "mobile");
  assert.equal(parsed.url, "https://firma.se");
  assert.equal(parsed.fetchedAt, NOW.toISOString());

  assert.equal(parsePageSpeed({}, "https://firma.se"), null);
  assert.equal(
    parsePageSpeed({ lighthouseResult: { categories: { performance: { score: 0.5 } } } }, "https://firma.se"),
    null,
  );
}

console.log("seo-score: alla tester gick igenom");
