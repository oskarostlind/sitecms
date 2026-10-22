// Tester för live-förhandsgranskningen mot dist/ (kör `npm run build` först, eller `npm test`).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createSitecms, editable, isPreview } from "../dist/index.js";
import {
  GET,
  SitecmsPreview,
  createPreviewRoute,
  isPreview as isPreviewFromPreview,
  previewFrameHeaders,
  safePreviewPath,
} from "../dist/preview.js";

const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const KEY = "sk_test_preview";
const TOKEN = "scp_hemligtoken_ABC123";
const API = "https://cms.example";

delete process.env.CMS_API_KEY;
delete process.env.CMS_SITE;
delete process.env.CMS_API_URL;

/** Fångar console.warn under fn. */
async function captureWarnings(fn) {
  const original = console.warn;
  const warnings = [];
  console.warn = (...args) => warnings.push(args.join(" "));
  try {
    await fn();
  } finally {
    console.warn = original;
  }
  return warnings;
}

const CONTENT = { site: { name: "Kund", domain: null }, pages: [{ slug: "home", title: "Start", blocks: [] }], services: [], seo: [] };
const PREVIEW_CONTENT = { ...CONTENT, pages: [{ slug: "home", title: "Start (osparad)", blocks: [] }], preview: true };

/** fetch-mock som loggar anropen och svarar via handler(url, init). */
function mockFetch(handler) {
  const calls = [];
  const fn = async (url, init = {}) => {
    calls.push({ url: String(url), init, headers: new Headers(init.headers) });
    return handler(String(url), init, calls.length);
  };
  fn.calls = calls;
  return fn;
}
const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

// ---------------------------------------------------------------------------
// editable()
// ---------------------------------------------------------------------------

test("editable: ger data-sitecms=\"page:key\"", () => {
  assert.deepEqual(editable("home", "hero.title"), { "data-sitecms": "home:hero.title" });
  assert.deepEqual(editable("om-oss", "team_1.bild-2"), { "data-sitecms": "om-oss:team_1.bild-2" });
});

test("editable: ogiltiga värden kastar inte, ger attributet och varnar i dev", async () => {
  const previous = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "development";
    let result;
    const warnings = await captureWarnings(() => {
      result = editable("Home", "hero title");
    });
    assert.deepEqual(result, { "data-sitecms": "Home:hero title" });
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /editable\("Home", "hero title"\)/);
    assert.match(warnings[0], /a–z, 0–9/);

    process.env.NODE_ENV = "production";
    const quiet = await captureWarnings(() => {
      assert.deepEqual(editable("x:y", "z"), { "data-sitecms": "x:y:z" });
    });
    assert.equal(quiet.length, 0, "ingen varning i produktion");
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});

// ---------------------------------------------------------------------------
// previewFrameHeaders()
// ---------------------------------------------------------------------------

test("previewFrameHeaders: default, CMS_API_URL, egen lista", async () => {
  assert.deepEqual(previewFrameHeaders(), [
    { key: "Content-Security-Policy", value: "frame-ancestors 'self' https://sitecms.se https://www.sitecms.se" },
  ]);

  process.env.CMS_API_URL = "http://localhost:3000/";
  try {
    assert.equal(previewFrameHeaders()[0].value, "frame-ancestors 'self' http://localhost:3000 https://www.sitecms.se");
    process.env.CMS_API_URL = "https://sitecms.se";
    assert.equal(previewFrameHeaders()[0].value, "frame-ancestors 'self' https://sitecms.se https://www.sitecms.se");
  } finally {
    delete process.env.CMS_API_URL;
  }

  assert.equal(
    previewFrameHeaders(["https://panel.example/", "https://panel.example", "https://*.vercel.app"])[0].value,
    "frame-ancestors 'self' https://panel.example https://*.vercel.app",
  );
  assert.equal(previewFrameHeaders([])[0].value, "frame-ancestors 'self'");

  let headers;
  const warnings = await captureWarnings(() => {
    headers = previewFrameHeaders(["javascript:alert(1)", "https://ok.se/sökväg", "inte en url", "http://localhost:4000"]);
  });
  assert.equal(headers[0].value, "frame-ancestors 'self' http://localhost:4000");
  assert.equal(warnings.length, 3);
});

// ---------------------------------------------------------------------------
// safePreviewPath()
// ---------------------------------------------------------------------------

test("safePreviewPath: bara egna sökvägar, aldrig öppen redirect", () => {
  const cases = [
    ["/", "/"],
    ["/om-oss", "/om-oss"],
    ["/tjanster?x=1#kontakt", "/tjanster?x=1#kontakt"],
    ["/a/../b", "/b"],
    ["  /trim  ", "/trim"],
    ["/åäö", "/%C3%A5%C3%A4%C3%B6"],
    ["//evil.se", "/"],
    ["//evil.se/x", "/"],
    ["/\\evil.se", "/"],
    ["/\\/evil.se", "/"],
    ["/x\\y", "/"],
    ["/\tevil", "/"],
    ["/\n/evil.se", "/"],
    ["https://evil.se", "/"],
    ["evil.se", "/"],
    ["javascript:alert(1)", "/"],
    ["", "/"],
    [null, "/"],
    [undefined, "/"],
  ];
  for (const [input, expected] of cases) assert.equal(safePreviewPath(input), expected, JSON.stringify(input));
});

// ---------------------------------------------------------------------------
// getContent() med preview-token
// ---------------------------------------------------------------------------

test("getContent: giltig token → x-sitecms-preview + no-store, utan cache-tagg", async () => {
  const fetch = mockFetch(() => json(200, PREVIEW_CONTENT));
  const cms = createSitecms({ apiKey: KEY, apiUrl: API, fetch, previewToken: async () => TOKEN });
  const content = await cms.getContent();
  assert.deepEqual(content, PREVIEW_CONTENT);
  assert.equal(fetch.calls.length, 1);
  const [call] = fetch.calls;
  assert.equal(call.url, `${API}/api/v1/site/content`);
  assert.equal(call.headers.get("x-api-key"), KEY);
  assert.equal(call.headers.get("x-sitecms-preview"), TOKEN);
  assert.equal(call.init.cache, "no-store");
  assert.equal(call.init.next, undefined, "inga next.tags i förhandsgranskning");

  // Slug-routen med CMS_SITE-semantik.
  const slugFetch = mockFetch(() => json(200, PREVIEW_CONTENT));
  await createSitecms({ apiKey: KEY, apiUrl: API, site: "kund", fetch: slugFetch, previewToken: () => TOKEN }).getContent();
  assert.equal(slugFetch.calls[0].url, `${API}/api/v1/sites/kund/content`);
});

test("getContent: 401 eller fel från förhandsgranskningen → vanligt innehåll", async () => {
  for (const failure of [
    () => json(401, { error: "Förhandsgranskningen har gått ut.", code: "preview_invalid" }),
    () => json(500, { error: "Serverfel" }),
    () => {
      throw new TypeError("fetch failed");
    },
  ]) {
    const fetch = mockFetch((url, init, n) => (n === 1 ? failure() : json(200, CONTENT)));
    const cms = createSitecms({ apiKey: KEY, apiUrl: API, fetch, previewToken: async () => TOKEN });
    let content;
    await captureWarnings(async () => {
      content = await cms.getContent();
    });
    assert.deepEqual(content, CONTENT);
    assert.equal(fetch.calls.length, 2);
    assert.equal(fetch.calls[0].headers.get("x-sitecms-preview"), TOKEN);
    const fallback = fetch.calls[1];
    assert.equal(fallback.headers.get("x-sitecms-preview"), null);
    assert.deepEqual(fallback.init.next, { tags: ["sitecms"] });
    assert.equal(fallback.init.cache, undefined);
  }
});

test("getContent: ingen token → oförändrat beteende (next.tags, ingen preview-header)", async () => {
  const resolvers = [async () => null, () => undefined, () => "", () => "   ", false];
  for (const previewToken of resolvers) {
    const fetch = mockFetch(() => json(200, CONTENT));
    const cms = createSitecms({ apiKey: KEY, apiUrl: API, fetch, previewToken, tag: "egen" });
    assert.deepEqual(await cms.getContent(), CONTENT);
    assert.equal(fetch.calls.length, 1);
    assert.equal(fetch.calls[0].headers.get("x-sitecms-preview"), null);
    assert.deepEqual(fetch.calls[0].init.next, { tags: ["egen"] });
    assert.equal(fetch.calls[0].init.cache, undefined);
  }

  // En resolver som kastar → vanligt innehåll.
  const fetch = mockFetch(() => json(200, CONTENT));
  const cms = createSitecms({
    apiKey: KEY,
    apiUrl: API,
    fetch,
    previewToken: () => {
      throw new Error("trasig");
    },
  });
  assert.deepEqual(await cms.getContent(), CONTENT);
  assert.equal(fetch.calls.length, 1);
});

test("getContent: standardläsaren utanför en Next-request → vanligt innehåll; posts påverkas inte", async () => {
  const fetch = mockFetch((url) => (url.endsWith("/posts") ? json(200, { posts: [] }) : json(200, CONTENT)));
  const cms = createSitecms({ apiKey: KEY, apiUrl: API, fetch });
  assert.deepEqual(await cms.getContent(), CONTENT);
  assert.deepEqual(await cms.getPosts(), []);
  for (const call of fetch.calls) {
    assert.equal(call.headers.get("x-sitecms-preview"), null);
    assert.deepEqual(call.init.next, { tags: ["sitecms"] });
  }
  assert.equal(await isPreview(), false);
  assert.equal(isPreviewFromPreview, isPreview);
  assert.equal(await SitecmsPreview(), null, "SitecmsPreview renderar null utan draft mode");
});

// ---------------------------------------------------------------------------
// GET-handlern
// ---------------------------------------------------------------------------

/** Mock av next/headers: draft mode + cookie-store som loggar set-anropen. */
function mockNext({ bypassValue = "preview-mode-id" } = {}) {
  const jar = new Map();
  const sets = [];
  const draft = {
    isEnabled: false,
    enabled: 0,
    disabled: 0,
    enable() {
      this.enabled++;
      this.isEnabled = true;
      // Som Next: draftMode().enable() sätter __prerender_bypass (utan partitioned).
      jar.set("__prerender_bypass", { name: "__prerender_bypass", value: bypassValue, sameSite: "none", secure: true });
    },
    disable() {
      this.disabled++;
      this.isEnabled = false;
      jar.set("__prerender_bypass", { name: "__prerender_bypass", value: "", expires: new Date(0) });
    },
  };
  const store = {
    get: (name) => jar.get(name),
    set: (options) => {
      sets.push(options);
      jar.set(options.name, options);
    },
  };
  // Next 15: promises. (Next 14: synkrona värden — se nästa test.)
  return { draft, sets, jar, headers: { draftMode: async () => draft, cookies: async () => store } };
}

const SECURE = { httpOnly: true, secure: true, sameSite: "none", partitioned: true, path: "/" };
const LOCAL = { httpOnly: true, secure: false, sameSite: "lax", path: "/" };

test("GET: verifierar token mot {apiBase}/preview, slår på draft mode, sätter cookies och 307", async () => {
  const fetch = mockFetch(() => json(200, { ok: true, expiresAt: "2026-10-22T12:00:00.000Z", panelOrigin: "https://sitecms.se" }));
  const next = mockNext();
  const handler = createPreviewRoute({ apiKey: KEY, apiUrl: API, fetch, nextHeaders: () => next.headers });
  const res = await handler(new Request(`https://kund.se/api/sitecms/preview?token=${TOKEN}&path=/om-oss?x=1`));

  assert.equal(res.status, 307);
  assert.equal(res.headers.get("location"), "/om-oss?x=1");
  assert.match(res.headers.get("cache-control"), /no-store/);

  assert.equal(fetch.calls.length, 1);
  const verify = fetch.calls[0];
  assert.equal(verify.url, `${API}/api/v1/site/preview`);
  assert.equal(verify.headers.get("x-api-key"), KEY);
  assert.equal(verify.headers.get("x-sitecms-preview"), TOKEN);
  assert.equal(verify.init.cache, "no-store");

  assert.equal(next.draft.enabled, 1);
  assert.deepEqual(next.sets, [
    { name: "__prerender_bypass", value: "preview-mode-id", ...SECURE },
    { name: "sitecms_preview", value: TOKEN, ...SECURE, maxAge: 7200 },
    { name: "sitecms_preview_origin", value: "https://sitecms.se", ...SECURE, maxAge: 7200 },
  ]);
});

test("GET: Next 14 (synkrona draftMode/cookies), slug-route och http://localhost → lax utan Secure/Partitioned", async () => {
  const fetch = mockFetch(() => json(200, { ok: true, expiresAt: "x", panelOrigin: "http://localhost:3000" }));
  const next = mockNext();
  const syncHeaders = { draftMode: () => next.draft, cookies: () => ({ get: (n) => next.jar.get(n), set: (o) => (next.sets.push(o), next.jar.set(o.name, o)) }) };
  const handler = createPreviewRoute({ apiKey: KEY, apiUrl: `${API}/`, site: "kund", fetch, nextHeaders: () => syncHeaders });
  const res = await handler(new Request(`http://localhost:3001/api/sitecms/preview?token=${TOKEN}`));
  assert.equal(res.status, 307);
  assert.equal(res.headers.get("location"), "/");
  assert.equal(fetch.calls[0].url, `${API}/api/v1/sites/kund/preview`);
  assert.deepEqual(next.sets, [
    { name: "__prerender_bypass", value: "preview-mode-id", ...LOCAL },
    { name: "sitecms_preview", value: TOKEN, ...LOCAL, maxAge: 7200 },
    { name: "sitecms_preview_origin", value: "http://localhost:3000", ...LOCAL, maxAge: 7200 },
  ]);
  for (const set of next.sets) assert.equal("partitioned" in set, false);
});

test("GET: läser CMS_API_KEY, CMS_API_URL och CMS_SITE från miljön (standard-GET)", async () => {
  const original = globalThis.fetch;
  const fetch = mockFetch(() => json(401, { error: "x", code: "preview_invalid" }));
  globalThis.fetch = fetch;
  process.env.CMS_API_KEY = KEY;
  process.env.CMS_API_URL = API;
  process.env.CMS_SITE = "kund";
  try {
    // Standard-GET utanför Next: next/headers finns (devDependency) men verify görs först.
    const res = await GET(new Request(`https://kund.se/api/sitecms/preview?token=${TOKEN}`));
    assert.equal(res.status, 401);
    assert.equal(fetch.calls[0].url, `${API}/api/v1/sites/kund/preview`);
    assert.equal(fetch.calls[0].headers.get("x-api-key"), KEY);
  } finally {
    globalThis.fetch = original;
    delete process.env.CMS_API_KEY;
    delete process.env.CMS_API_URL;
    delete process.env.CMS_SITE;
  }
});

test("GET: ogiltig token → 401 HTML på svenska, token ekas inte, inget draft mode", async () => {
  const scenarios = [
    ["401 från sitecms", () => json(401, { error: "Förhandsgranskningen har gått ut.", code: "preview_invalid" }), /gått ut eller är ogiltig/],
    ["nätverksfel", () => Promise.reject(new TypeError("fetch failed")), /gick inte att nå/],
    ["5xx", () => json(503, {}), /gick inte att nå/],
    ["ogiltig panelOrigin", () => json(200, { ok: true, panelOrigin: "javascript:alert(1)" }), /gått ut eller är ogiltig/],
    ["panelOrigin med sökväg", () => json(200, { ok: true, panelOrigin: "https://sitecms.se/admin" }), /gått ut eller är ogiltig/],
    ["inte JSON", () => new Response("<html>", { status: 200 }), /gått ut eller är ogiltig/],
  ];
  for (const [name, reply, messageRe] of scenarios) {
    const fetch = mockFetch(reply);
    const next = mockNext();
    const handler = createPreviewRoute({ apiKey: KEY, apiUrl: API, fetch, nextHeaders: () => next.headers });
    const res = await handler(new Request(`https://kund.se/api/sitecms/preview?token=${TOKEN}&path=/x`));
    assert.equal(res.status, 401, name);
    assert.match(res.headers.get("content-type"), /^text\/html; charset=utf-8/);
    assert.match(res.headers.get("cache-control"), /no-store/);
    const html = await res.text();
    assert.match(html, /<html lang="sv">/);
    assert.match(html, /Förhandsgranskningen kunde inte startas/);
    assert.match(html, messageRe, name);
    assert.ok(!html.includes(TOKEN), `${name}: token får inte ekas`);
    assert.equal(next.draft.enabled, 0, name);
    assert.equal(next.sets.length, 0, name);
  }

  // Ingen token alls → 401 utan anrop till sitecms.
  const fetch = mockFetch(() => json(200, { ok: true, panelOrigin: "https://sitecms.se" }));
  const next = mockNext();
  const handler = createPreviewRoute({ apiKey: KEY, apiUrl: API, fetch, nextHeaders: () => next.headers });
  for (const query of ["", "?token=", "?token=%20%20&path=/"]) {
    const res = await handler(new Request(`https://kund.se/api/sitecms/preview${query}`));
    assert.equal(res.status, 401, query);
  }
  assert.equal(fetch.calls.length, 0);

  // Ingen nyckel på sajten → 500 med förklaring.
  const noKey = createPreviewRoute({ apiKey: "", apiUrl: API, fetch, nextHeaders: () => next.headers });
  const res = await noKey(new Request(`https://kund.se/api/sitecms/preview?token=${TOKEN}`));
  assert.equal(res.status, 500);
  assert.match(await res.text(), /CMS_API_KEY saknas/);
});

test("GET: path saneras (ingen öppen redirect)", async () => {
  const fetch = mockFetch(() => json(200, { ok: true, panelOrigin: "https://sitecms.se" }));
  for (const [path, expected] of [
    ["//evil.se", "/"],
    ["/\\evil.se", "/"],
    ["/%5Cevil.se", "/%5Cevil.se"],
    ["https://evil.se", "/"],
    ["/tjanster", "/tjanster"],
  ]) {
    const next = mockNext();
    const handler = createPreviewRoute({ apiKey: KEY, apiUrl: API, fetch, nextHeaders: () => next.headers });
    const res = await handler(new Request(`https://kund.se/api/sitecms/preview?token=${TOKEN}&path=${encodeURIComponent(path)}`));
    assert.equal(res.headers.get("location"), expected, path);
  }
});

test("GET ?disable=1: stänger av draft mode, rensar cookies (samma attribut) och 307", async () => {
  const fetch = mockFetch(() => json(500, {}));
  const next = mockNext();
  const handler = createPreviewRoute({ apiKey: KEY, apiUrl: API, fetch, nextHeaders: () => next.headers });
  const res = await handler(new Request("https://kund.se/api/sitecms/preview?disable=1&path=/om-oss"));
  assert.equal(res.status, 307);
  assert.equal(res.headers.get("location"), "/om-oss");
  assert.equal(next.draft.disabled, 1);
  assert.equal(fetch.calls.length, 0);
  assert.deepEqual(
    next.sets.map((s) => s.name),
    ["__prerender_bypass", "sitecms_preview", "sitecms_preview_origin"],
  );
  for (const set of next.sets) {
    assert.equal(set.value, "");
    assert.equal(set.expires.getTime(), 0);
    assert.equal(set.partitioned, true);
    assert.equal(set.sameSite, "none");
    assert.equal(set.secure, true);
  }

  const local = mockNext();
  const localHandler = createPreviewRoute({ apiKey: KEY, nextHeaders: () => local.headers });
  const localRes = await localHandler(new Request("http://localhost:3000/api/sitecms/preview?disable=1&path=//evil.se"));
  assert.equal(localRes.headers.get("location"), "/");
  for (const set of local.sets) {
    assert.equal(set.secure, false);
    assert.equal(set.sameSite, "lax");
    assert.equal("partitioned" in set, false);
  }
});

// ---------------------------------------------------------------------------
// Bygget
// ---------------------------------------------------------------------------

test('dist/preview-client.js börjar med "use client"; preview.js gör det inte', () => {
  const client = readFileSync(join(DIST, "preview-client.js"), "utf8");
  assert.ok(client.startsWith('"use client";'), client.slice(0, 40));
  const server = readFileSync(join(DIST, "preview.js"), "utf8");
  assert.ok(!server.includes('"use client"'));
  // next/headers importeras bara dynamiskt (inte på toppnivå) …
  for (const file of ["next-headers.server.js", "preview.js"]) {
    const code = readFileSync(join(DIST, file), "utf8");
    assert.doesNotMatch(code, /^import[^;]*next\/headers/m, file);
    assert.match(code, /await import\("next\/headers\.js"\)/, file);
  }
  // … och huvudpaketet (som klientkomponenter importerar för editable()) når
  // den bara via "#next-headers", som pekar på en tom variant utanför "react-server".
  const importsNextHeaders = /(?:import|from)\s*\(?\s*["']next\/headers/;
  assert.doesNotMatch(readFileSync(join(DIST, "index.js"), "utf8"), importsNextHeaders);
  assert.doesNotMatch(readFileSync(join(DIST, "next-headers.js"), "utf8"), importsNextHeaders);
  assert.match(readFileSync(join(DIST, "index.js"), "utf8"), /from "#next-headers"/);
  const pkg = JSON.parse(readFileSync(join(DIST, "..", "package.json"), "utf8"));
  assert.deepEqual(pkg.imports["#next-headers"], {
    types: "./dist/next-headers.d.ts",
    "react-server": "./dist/next-headers.server.js",
    default: "./dist/next-headers.js",
  });
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}), [], "inga runtime-beroenden");
  assert.equal(pkg.exports["./preview-client"].import, "./dist/preview-client.js");
  assert.equal(pkg.exports["./preview"].types, "./dist/preview.d.ts");
});
