// Tester för trafikpixeln mot dist/ (kör `npm run build` först, eller `npm test`).
import { test } from "node:test";
import assert from "node:assert/strict";
import { ANALYTICS_ROUTE_PATH, POST, SitecmsAnalytics, createAnalyticsRoute, shouldTrack, utmQuery } from "../dist/analytics.js";
import { SitecmsAnalyticsClient, shouldTrack as shouldTrackFromClient } from "../dist/analytics-client.js";

const KEY = "sk_test_analytics";
const API = "https://cms.example";
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";

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

/** fetch-mock som loggar anropen och svarar via handler(url, init). */
function mockFetch(handler) {
  const calls = [];
  const fn = async (url, init = {}) => {
    calls.push({ url: String(url), init, headers: new Headers(init.headers), body: init.body ? JSON.parse(init.body) : null });
    return handler(String(url), init, calls.length);
  };
  fn.calls = calls;
  return fn;
}
const noContent = () => new Response(null, { status: 204 });

/** Ett anrop från webbläsaren till sajtens route, med proxy-headers som Vercel sätter. */
function browserRequest(payload, headers = {}) {
  return new Request("https://kund.se/api/sitecms/events", {
    method: "POST",
    headers: {
      "content-type": "text/plain;charset=UTF-8",
      "user-agent": UA,
      "x-forwarded-for": "1.2.3.4, 10.0.0.1",
      "x-vercel-ip-country": "SE",
      host: "kund.se",
      ...headers,
    },
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  });
}

/** Kör fn med en stubbad globalThis.fetch. */
async function withGlobalFetch(fetchImpl, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
}

// ---------------------------------------------------------------------------
// shouldTrack() / utmQuery()
// ---------------------------------------------------------------------------

test("shouldTrack: skickar vid ny pathname, aldrig på localhost/webdriver/dubblett", () => {
  assert.equal(shouldTrack, shouldTrackFromClient, "samma funktion exporteras från båda subpaths");
  assert.equal(shouldTrack("/", null, "kund.se", false), true);
  assert.equal(shouldTrack("/om-oss", "/", "kund.se", false), true);
  assert.equal(shouldTrack("/om-oss", "/om-oss", "kund.se", false), false, "samma pathname i rad");
  assert.equal(shouldTrack("/", null, "localhost", false), false);
  assert.equal(shouldTrack("/", null, "app.localhost", false), false);
  assert.equal(shouldTrack("/", null, "127.0.0.1", false), false);
  assert.equal(shouldTrack("/", null, "[::1]", false), false);
  assert.equal(shouldTrack("/", null, "kund.se", true), false, "navigator.webdriver");
  assert.equal(shouldTrack(null, null, "kund.se", false), false);
  assert.equal(shouldTrack("", null, "kund.se", false), false);
  assert.equal(shouldTrack("/", null, "kund.vercel.app", false), true);
});

test("utmQuery: bara querysträngar med utm_, utan ?", () => {
  assert.equal(utmQuery("?utm_source=linkedin&utm_medium=post"), "utm_source=linkedin&utm_medium=post");
  assert.equal(utmQuery("utm_source=x"), "utm_source=x");
  assert.equal(utmQuery("?a=1&utm_campaign=var"), "a=1&utm_campaign=var");
  assert.equal(utmQuery("?a=1&b=2"), "");
  assert.equal(utmQuery("?notutm_source=x"), "");
  assert.equal(utmQuery(""), "");
  assert.equal(utmQuery(null), "");
  assert.equal(utmQuery(undefined), "");
});

// ---------------------------------------------------------------------------
// POST-handlern
// ---------------------------------------------------------------------------

test("POST: skickar { events: [{ p, r, q, ua, ip, c }] } till …/events med x-api-key och svarar 204", async () => {
  const fetch = mockFetch(() => noContent());
  process.env.CMS_API_KEY = KEY;
  process.env.CMS_API_URL = API;
  try {
    const res = await withGlobalFetch(fetch, () =>
      POST(browserRequest({ p: "/om-oss", r: "https://www.google.com/", q: "utm_source=linkedin" })),
    );
    assert.equal(res.status, 204);
    assert.equal(res.headers.get("cache-control"), "private, no-store");
    assert.equal(fetch.calls.length, 1);
    const [call] = fetch.calls;
    assert.equal(call.url, `${API}/api/v1/site/events`);
    assert.equal(call.init.method, "POST");
    assert.equal(call.init.cache, "no-store");
    assert.equal(call.headers.get("x-api-key"), KEY);
    assert.equal(call.headers.get("content-type"), "application/json");
    assert.deepEqual(call.body, {
      events: [{ p: "/om-oss", r: "https://www.google.com/", q: "utm_source=linkedin", ua: UA, ip: "1.2.3.4", c: "SE" }],
    });
  } finally {
    delete process.env.CMS_API_KEY;
    delete process.env.CMS_API_URL;
  }
});

test("POST: CMS_SITE ger slug-routen; x-real-ip och cf-ipcountry som fallback; egen referer tas bort", async () => {
  const fetch = mockFetch(() => noContent());
  const handler = createAnalyticsRoute({ apiKey: KEY, apiUrl: `${API}/`, site: "kund", fetch });
  const res = await handler(
    browserRequest(
      { p: "/kontakt", r: "https://www.kund.se/om-oss" },
      { "x-forwarded-for": "", "x-real-ip": "5.6.7.8", "x-vercel-ip-country": "", "cf-ipcountry": "no" },
    ),
  );
  assert.equal(res.status, 204);
  assert.equal(fetch.calls[0].url, `${API}/api/v1/sites/kund/events`);
  assert.deepEqual(fetch.calls[0].body, { events: [{ p: "/kontakt", ua: UA, ip: "5.6.7.8", c: "no" }] });

  // Utan land/IP/UA skickas fälten inte alls.
  const bare = await handler(
    new Request("https://kund.se/api/sitecms/events", { method: "POST", body: JSON.stringify({ p: "/" }) }),
  );
  assert.equal(bare.status, 204);
  assert.deepEqual(fetch.calls[1].body, { events: [{ p: "/" }] });
});

test("POST: utan CMS_API_KEY → 204 och ingen vidarebefordran", async () => {
  delete process.env.CMS_API_KEY;
  const fetch = mockFetch(() => noContent());
  const res = await withGlobalFetch(fetch, () => POST(browserRequest({ p: "/" })));
  assert.equal(res.status, 204);
  assert.equal(fetch.calls.length, 0);

  const explicit = createAnalyticsRoute({ apiKey: "   ", fetch });
  assert.equal((await explicit(browserRequest({ p: "/" }))).status, 204);
  assert.equal(fetch.calls.length, 0);
});

test("POST: ogiltig eller för stor body → 204 utan anrop", async () => {
  const fetch = mockFetch(() => noContent());
  const handler = createAnalyticsRoute({ apiKey: KEY, apiUrl: API, fetch });
  for (const body of ["inte json", "", "[]", "null", JSON.stringify({ r: "x" }), JSON.stringify({ p: "" }), JSON.stringify({ p: 1 })]) {
    const res = await handler(browserRequest(body));
    assert.equal(res.status, 204, JSON.stringify(body));
  }
  const big = await handler(browserRequest({ p: "/", r: "x".repeat(3000) }));
  assert.equal(big.status, 204);
  assert.equal(fetch.calls.length, 0);
});

test("POST: fel från sitecms → 204 ändå, console.warn högst en gång per process", async () => {
  const failing = mockFetch((url, init, n) => (n === 1 ? new Response("{}", { status: 401 }) : Promise.reject(new TypeError("fetch failed"))));
  const handler = createAnalyticsRoute({ apiKey: KEY, apiUrl: API, fetch: failing });
  const warnings = await captureWarnings(async () => {
    for (let i = 0; i < 3; i++) {
      const res = await handler(browserRequest({ p: `/sida-${i}` }));
      assert.equal(res.status, 204);
    }
  });
  assert.equal(failing.calls.length, 3, "varje sidvisning försöker skickas");
  assert.equal(warnings.length, 1, "bara en varning per process");
  assert.match(warnings[0], /trafikpixeln/);
  assert.match(warnings[0], /401/);
  assert.doesNotMatch(warnings[0], new RegExp(KEY), "nyckeln loggas aldrig");
});

// ---------------------------------------------------------------------------
// <SitecmsAnalytics />
// ---------------------------------------------------------------------------

test("SitecmsAnalytics: utanför förhandsgranskningen renderas klientkomponenten med endpoint", async () => {
  assert.equal(ANALYTICS_ROUTE_PATH, "/api/sitecms/events");
  const element = await SitecmsAnalytics();
  assert.ok(element, "renderar något utanför draft mode");
  assert.equal(element.type, SitecmsAnalyticsClient);
  assert.equal(element.props.endpoint, "/api/sitecms/events");

  const custom = await SitecmsAnalytics({ endpoint: "/api/egen/events" });
  assert.equal(custom.props.endpoint, "/api/egen/events");
});
