/**
 * Tester för trafikpixelns rena funktioner (docs/SEO-TRAFIK.md §2–3), utan
 * databas:
 *
 *   npm run test:traffic
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  analyticsSalt,
  classifyDevice,
  classifySource,
  dayRange,
  isBot,
  isOwnHost,
  normalizeCountry,
  normalizeEvents,
  normalizePath,
  shiftDay,
  utcDay,
  visitorHash,
} from "../lib/traffic-normalize";

// --- dagar (UTC) ---
assert.equal(utcDay(new Date("2026-10-22T23:59:59.000Z")), "2026-10-22");
assert.equal(utcDay(new Date("2026-10-22T00:00:00.000Z")), "2026-10-22");
assert.equal(shiftDay("2026-03-01", -1), "2026-02-28");
assert.equal(shiftDay("2026-12-31", 1), "2027-01-01");
assert.deepEqual(dayRange("2026-10-20", "2026-10-22"), ["2026-10-20", "2026-10-21", "2026-10-22"]);
assert.deepEqual(dayRange("2026-10-22", "2026-10-20"), []);

// --- normalizePath ---
for (const [input, expected] of [
  ["/", "/"],
  ["", "/"],
  ["/om-oss", "/om-oss"],
  ["/om-oss/", "/om-oss"],
  ["/om-oss?utm_source=x#top", "/om-oss"],
  ["om-oss", "/om-oss"],
  ["//dubbel///snedstreck", "/dubbel/snedstreck"],
  ["https://kund.se/tjanster?x=1", "/tjanster"],
  ["/åäö", "/åäö"],
  ["/x\\y", "/"],
  ["/\tflik", "/"],
  [42, "/"],
  [null, "/"],
] as [unknown, string][]) {
  assert.equal(normalizePath(input), expected, JSON.stringify(input));
}
assert.equal(normalizePath(`/${"a".repeat(300)}`).length, 200);
assert.equal(normalizePath(`/${"a".repeat(3000)}`), "/", "över 2048 tecken → /");

// --- classifySource ---
assert.equal(classifySource("", "", "kund.se"), "direkt");
assert.equal(classifySource(undefined, undefined, null), "direkt");
assert.equal(classifySource("https://www.google.com/", "", "kund.se"), "google");
assert.equal(classifySource("https://www.google.se/search?q=x", "", "kund.se"), "google");
assert.equal(classifySource("https://chatgpt.com/", "", "kund.se"), "ai:chatgpt");
assert.equal(classifySource("https://lnkd.in/abc", "", "kund.se"), "linkedin");
assert.equal(classifySource("https://example.com/sida", "", "kund.se"), "ref:example.com");
assert.equal(classifySource("https://www.kund.se/start", "", "kund.se"), "direkt", "egen domän = direkt");
assert.equal(classifySource("https://blogg.kund.se/", "", "www.kund.se"), "direkt", "underdomän = direkt");
assert.equal(classifySource("https://kund.se/", "", "https://kund.se/"), "direkt", "domänen får vara en URL");
assert.equal(classifySource("https://notkund.se/", "", "kund.se"), "ref:notkund.se");
assert.equal(classifySource("https://www.kund.se/", "", null), "ref:kund.se", "utan domän kan egen trafik inte kännas igen");
assert.equal(classifySource("https://www.google.com/", "utm_source=LinkedIn&utm_medium=post", "kund.se"), "utm:linkedin");
assert.equal(classifySource("", "?utm_source=nyhetsbrev", "kund.se"), "utm:nyhetsbrev");
assert.equal(classifySource("", "utm_medium=post", "kund.se"), "direkt", "utm_medium utan utm_source räknas inte");
assert.equal(classifySource("inte en url", "", "kund.se"), "direkt");
assert.ok(classifySource("", `utm_source=${"x".repeat(200)}`, null).length <= 80);

// --- isOwnHost ---
assert.equal(isOwnHost("kund.se", "kund.se"), true);
assert.equal(isOwnHost("www.kund.se", "kund.se"), true);
assert.equal(isOwnHost("kund.se", null), false);
assert.equal(isOwnHost("kund.se.evil.com", "kund.se"), false);

// --- classifyDevice ---
const UA_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const UA_ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36";
const UA_ANDROID_TABLET = "Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const UA_IPAD = "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const UA_DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const UA_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
assert.equal(classifyDevice(UA_IPHONE), "mobile");
assert.equal(classifyDevice(UA_ANDROID), "mobile");
assert.equal(classifyDevice(UA_ANDROID_TABLET), "tablet");
assert.equal(classifyDevice(UA_IPAD), "tablet");
assert.equal(classifyDevice(UA_DESKTOP), "desktop");
assert.equal(classifyDevice(UA_MAC), "desktop");
assert.equal(classifyDevice(""), "desktop");
assert.equal(classifyDevice(undefined), "desktop");

// --- isBot ---
assert.equal(isBot(""), true);
assert.equal(isBot("   "), true);
assert.equal(isBot(undefined), true);
assert.equal(isBot(null), true);
assert.equal(isBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"), true);
assert.equal(isBot("Mozilla/5.0 (compatible; bingbot/2.0)"), true);
assert.equal(isBot("facebookexternalhit/1.1"), true);
assert.equal(isBot("curl/8.4.0"), true);
assert.equal(isBot("Wget/1.21"), true);
assert.equal(isBot("python-requests/2.31"), true);
assert.equal(isBot("node-fetch/1.0"), true);
assert.equal(isBot("Go-http-client/1.1"), true);
assert.equal(isBot("Mozilla/5.0 HeadlessChrome/120.0"), true);
assert.equal(isBot("Chrome-Lighthouse"), true);
assert.equal(isBot("Mozilla/5.0 (Linux) AppleWebKit Chrome/120.0 Safari/537.36 PageSpeed Insights"), true);
assert.equal(isBot("Slackbot-LinkExpanding 1.0"), true);
assert.equal(isBot("Mozilla/5.0 (compatible; Yahoo! Slurp)"), true);
assert.equal(isBot("vercel-screenshot/1.0 preview"), true);
assert.equal(isBot(UA_DESKTOP), false);
assert.equal(isBot(UA_IPHONE), false);
assert.equal(isBot(UA_MAC), false);

// --- normalizeCountry ---
assert.equal(normalizeCountry("se"), "SE");
assert.equal(normalizeCountry("SE"), "SE");
assert.equal(normalizeCountry(" no "), "NO");
assert.equal(normalizeCountry("XX1"), "ZZ");
assert.equal(normalizeCountry(""), "ZZ");
assert.equal(normalizeCountry(undefined), "ZZ");

// --- visitorHash ---
const expectedHash = createHash("sha256").update("salt:2026-10-22:site-1:1.2.3.4:UA").digest("hex");
assert.equal(visitorHash("salt", "2026-10-22", "site-1", "1.2.3.4", "UA"), expectedHash);
assert.match(visitorHash("salt", "2026-10-22", "site-1", "1.2.3.4", "UA"), /^[a-f0-9]{64}$/);
assert.notEqual(
  visitorHash("salt", "2026-10-22", "site-1", "1.2.3.4", "UA"),
  visitorHash("salt", "2026-10-23", "site-1", "1.2.3.4", "UA"),
  "ny dag → ny hash",
);
assert.notEqual(
  visitorHash("salt", "2026-10-22", "site-1", "1.2.3.4", "UA"),
  visitorHash("salt", "2026-10-22", "site-2", "1.2.3.4", "UA"),
  "annan sajt → annan hash",
);
assert.notEqual(
  visitorHash("salt-a", "2026-10-22", "site-1", "1.2.3.4", "UA"),
  visitorHash("salt-b", "2026-10-22", "site-1", "1.2.3.4", "UA"),
  "annat salt → annan hash",
);

// --- analyticsSalt ---
assert.equal(analyticsSalt({ ANALYTICS_SALT: " hemligt " }), "hemligt");
assert.equal(analyticsSalt({ AUTH_SECRET: "auth" }), "auth", "fallback AUTH_SECRET");
assert.equal(analyticsSalt({ ANALYTICS_SALT: "a", AUTH_SECRET: "b" }), "a", "ANALYTICS_SALT vinner");
assert.throws(() => analyticsSalt({ NODE_ENV: "production" }), /ANALYTICS_SALT/);
{
  const original = console.warn;
  const warnings: string[] = [];
  console.warn = (...args: unknown[]) => warnings.push(args.join(" "));
  try {
    assert.equal(analyticsSalt({ NODE_ENV: "test" }), "dev-salt");
    assert.equal(analyticsSalt({}), "dev-salt");
  } finally {
    console.warn = original;
  }
  assert.equal(warnings.length, 1, "varnar bara en gång per process");
  assert.match(warnings[0], /dev-salt/);
}

// --- normalizeEvents ---
const ctx = { siteId: "site-1", domain: "kund.se", day: "2026-10-22", salt: "salt", fallbackIp: "9.9.9.9" };

const full = normalizeEvents(
  {
    events: [
      { p: "/om-oss/?x=1", r: "https://www.google.com/", q: "", ua: UA_IPHONE, ip: "1.2.3.4", c: "se", t: Date.now() },
    ],
  },
  ctx,
);
assert.ok(full.ok);
if (full.ok) {
  assert.deepEqual(full.events, [
    {
      path: "/om-oss",
      source: "google",
      country: "SE",
      device: "mobile",
      visitorHash: visitorHash("salt", "2026-10-22", "site-1", "1.2.3.4", UA_IPHONE),
    },
  ]);
}

// Bara p är obligatoriskt; IP tas från anropet när eventet saknar den.
const minimal = normalizeEvents({ events: [{ p: "/", ua: UA_DESKTOP }] }, ctx);
assert.ok(minimal.ok);
if (minimal.ok) {
  assert.equal(minimal.events.length, 1);
  assert.deepEqual(
    minimal.events[0],
    { path: "/", source: "direkt", country: "ZZ", device: "desktop", visitorHash: visitorHash("salt", "2026-10-22", "site-1", "9.9.9.9", UA_DESKTOP) },
  );
}

// Robotar och tom UA filtreras tyst — tom lista är ett giltigt resultat.
const bots = normalizeEvents(
  { events: [{ p: "/", ua: "Googlebot/2.1" }, { p: "/" }, { p: "/", ua: "" }, { p: "/", ua: UA_MAC }] },
  ctx,
);
assert.ok(bots.ok);
if (bots.ok) assert.equal(bots.events.length, 1);

// UTM slår referer; egen domän = direkt.
const sources = normalizeEvents(
  {
    events: [
      { p: "/a", r: "https://www.google.com/", q: "utm_source=Nyhetsbrev&utm_medium=mail", ua: UA_MAC },
      { p: "/b", r: "https://www.kund.se/a", ua: UA_MAC },
      { p: "/c", r: "https://news.ycombinator.com/", ua: UA_MAC },
    ],
  },
  ctx,
);
assert.ok(sources.ok);
if (sources.ok) assert.deepEqual(sources.events.map((e) => e.source), ["utm:nyhetsbrev", "direkt", "ref:news.ycombinator.com"]);

// Ogiltiga bodies → ok: false med svenskt fel.
for (const bad of [
  null,
  "sträng",
  [],
  {},
  { events: [] },
  { events: "x" },
  { events: [null] },
  { events: ["x"] },
  { events: [{}] },
  { events: [{ p: "" }] },
  { events: [{ p: 1 }] },
  { events: [{ p: "/".padEnd(2049, "a") }] },
  { events: [{ p: "/", ua: 5 }] },
  { events: [{ p: "/", r: {} }] },
  { events: [{ p: "/", t: "nu" }] },
  { events: Array.from({ length: 21 }, () => ({ p: "/", ua: UA_MAC })) },
]) {
  const result = normalizeEvents(bad, ctx);
  assert.equal(result.ok, false, JSON.stringify(bad)?.slice(0, 80));
  if (!result.ok) assert.ok(result.error.length > 0);
}

// Exakt 20 events går bra.
const twenty = normalizeEvents({ events: Array.from({ length: 20 }, (_, i) => ({ p: `/s${i}`, ua: UA_MAC })) }, ctx);
assert.ok(twenty.ok);
if (twenty.ok) assert.equal(twenty.events.length, 20);

// Aldrig IP/UA i resultatet.
if (full.ok) {
  const json = JSON.stringify(full.events);
  assert.ok(!json.includes("1.2.3.4"));
  assert.ok(!json.includes("iPhone"));
}

console.log("traffic-test: alla tester gröna");
