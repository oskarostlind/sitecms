// Tester mot dist/ (kör `npm run build` först, eller `npm test`).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { apiBase, createSitecms, getContent, verifyRevalidateSecret, verifyWebhook, verifyWebhookDetailed } from "../dist/index.js";
import { createRevalidateHandler } from "../dist/revalidate.js";

const KEY = "sk_test_9f8e7d6c5b4a";
const OTHER_KEY = "sk_test_annan_nyckel";

/** Signerar oberoende av paketet (node:crypto), enligt kontrakt 2. */
function sign(apiKey, timestamp, rawBody) {
  const keyHash = createHash("sha256").update(apiKey, "utf8").digest("hex");
  return createHmac("sha256", Buffer.from(keyHash, "utf8")).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
}
const nowSeconds = () => Math.floor(Date.now() / 1000);
function payload(ts, extra = {}) {
  return JSON.stringify({ event: "content.updated", site: "kund", timestamp: ts, ...extra });
}
function headersFor(ts, signature) {
  return new Headers({
    "content-type": "application/json",
    "user-agent": "sitecms-webhook",
    "x-sitecms-timestamp": String(ts),
    "x-sitecms-signature": signature,
  });
}

// Miljön får inte påverka testerna av explicita värden.
delete process.env.CMS_API_KEY;
delete process.env.CMS_REVALIDATE_SECRET;
delete process.env.CMS_SITE;
delete process.env.CMS_API_URL;

test("verifyWebhook: korrekt signatur godkänns (Headers)", async () => {
  const ts = nowSeconds();
  const body = payload(ts);
  const ok = await verifyWebhook({ rawBody: body, headers: headersFor(ts, `v1=${sign(KEY, ts, body)}`), apiKey: KEY });
  assert.equal(ok, true);
});

test("verifyWebhook: vanligt objekt med blandade versaler och Uint8Array-body", async () => {
  const ts = nowSeconds();
  const body = payload(ts, { note: "åäö" });
  const ok = await verifyWebhook({
    rawBody: new TextEncoder().encode(body),
    headers: { "X-Sitecms-Timestamp": String(ts), "X-Sitecms-Signature": `v1=${sign(KEY, ts, body).toUpperCase()}` },
    apiKey: KEY,
  });
  assert.equal(ok, true);
});

test("verifyWebhook: fel nyckel avvisas", async () => {
  const ts = nowSeconds();
  const body = payload(ts);
  const sig = `v1=${sign(OTHER_KEY, ts, body)}`;
  assert.equal(await verifyWebhook({ rawBody: body, headers: headersFor(ts, sig), apiKey: KEY }), false);
});

test("verifyWebhook: ändrad body avvisas", async () => {
  const ts = nowSeconds();
  const body = payload(ts);
  const sig = `v1=${sign(KEY, ts, body)}`;
  assert.equal(await verifyWebhook({ rawBody: body + " ", headers: headersFor(ts, sig), apiKey: KEY }), false);
});

test("verifyWebhook: tidsstämpel utanför ±300 s avvisas", async () => {
  for (const ts of [nowSeconds() - 301, nowSeconds() + 301, nowSeconds() - 3600]) {
    const body = payload(ts);
    const ok = await verifyWebhook({ rawBody: body, headers: headersFor(ts, `v1=${sign(KEY, ts, body)}`), apiKey: KEY });
    assert.equal(ok, false, `ts ${ts}`);
  }
  const ts = nowSeconds() - 290;
  const body = payload(ts);
  assert.equal(await verifyWebhook({ rawBody: body, headers: headersFor(ts, `v1=${sign(KEY, ts, body)}`), apiKey: KEY }), true);
  // Egen tolerans.
  const old = nowSeconds() - 1000;
  const oldBody = payload(old);
  const oldHeaders = headersFor(old, `v1=${sign(KEY, old, oldBody)}`);
  assert.equal(await verifyWebhook({ rawBody: oldBody, headers: oldHeaders, apiKey: KEY, toleranceSeconds: 2000 }), true);
});

test("verifyWebhook: ogiltig tidsstämpel avvisas", async () => {
  const body = payload(1);
  const sig = `v1=${sign(KEY, "abc", body)}`;
  assert.equal(await verifyWebhook({ rawBody: body, headers: headersFor("abc", sig), apiKey: KEY }), false);
});

test("verifyWebhook: flera v1-poster (en per nyckel)", async () => {
  const ts = nowSeconds();
  const body = payload(ts);
  const good = sign(KEY, ts, body);
  const other = sign(OTHER_KEY, ts, body);
  for (const header of [`v1=${other},v1=${good}`, `v1=${good},v1=${other}`, `v1=deadbeef, v1=${good}`, `v0=x,v1=${good}`]) {
    assert.equal(await verifyWebhook({ rawBody: body, headers: headersFor(ts, header), apiKey: KEY }), true, header);
  }
  assert.equal(await verifyWebhook({ rawBody: body, headers: headersFor(ts, `v1=${other},v1=deadbeef`), apiKey: KEY }), false);
  assert.equal(await verifyWebhook({ rawBody: body, headers: headersFor(ts, `v0=${good}`), apiKey: KEY }), false);
});

test("verifyWebhook: legacy secret i bodyn", async () => {
  const ts = nowSeconds();
  const body = payload(ts, { secret: "hemligt" });
  const noSig = new Headers({ "content-type": "application/json" });
  assert.equal(await verifyWebhook({ rawBody: body, headers: noSig, legacySecret: "hemligt", apiKey: "" }), true);
  assert.equal(await verifyWebhook({ rawBody: body, headers: noSig, legacySecret: "fel", apiKey: "" }), false);
  assert.equal(await verifyWebhook({ rawBody: body, headers: noSig, apiKey: KEY }), false);
  // Gammal mottagare med både nyckel och hemlighet: fel signatur men rätt secret → OK.
  const bad = headersFor(ts, "v1=deadbeef");
  assert.equal(await verifyWebhook({ rawBody: body, headers: bad, apiKey: KEY, legacySecret: "hemligt" }), true);
  // Ingen JSON → inget legacy-stöd.
  assert.equal(await verifyWebhook({ rawBody: "secret=hemligt", headers: noSig, legacySecret: "hemligt", apiKey: "" }), false);
  assert.equal(await verifyRevalidateSecret("hemligt", "hemligt"), true);
  assert.equal(await verifyRevalidateSecret("hemligt", undefined), false);
});

test("verifyWebhook: läser CMS_API_KEY / CMS_REVALIDATE_SECRET som standard", async () => {
  const ts = nowSeconds();
  const body = payload(ts, { secret: "s3" });
  process.env.CMS_API_KEY = KEY;
  try {
    assert.equal(await verifyWebhook({ rawBody: body, headers: headersFor(ts, `v1=${sign(KEY, ts, body)}`) }), true);
    assert.equal(await verifyWebhook({ rawBody: body, headers: headersFor(ts, "v1=00") }), false);
    process.env.CMS_REVALIDATE_SECRET = "s3";
    assert.equal(await verifyWebhook({ rawBody: body, headers: headersFor(ts, "v1=00") }), true);
  } finally {
    delete process.env.CMS_API_KEY;
    delete process.env.CMS_REVALIDATE_SECRET;
  }
});

test("revalidate-route: 500 utan nyckel/hemlighet, 401 vid fel signatur", async () => {
  const ts = nowSeconds();
  const body = payload(ts);
  const req = (headers) => new Request("https://kund.se/api/sitecms/revalidate", { method: "POST", body, headers });

  const none = await createRevalidateHandler()(req(headersFor(ts, "v1=00")));
  assert.equal(none.status, 500);
  assert.match((await none.json()).error, /CMS_API_KEY saknas/);

  const wrong = await createRevalidateHandler({ apiKey: KEY })(req(headersFor(ts, `v1=${sign(OTHER_KEY, ts, body)}`)));
  assert.equal(wrong.status, 401);
  assert.equal((await wrong.json()).revalidated, false);

  const wrongSecret = await createRevalidateHandler({ secret: "x" })(
    new Request("https://kund.se/x", { method: "POST", body: JSON.stringify({ secret: "y" }) }),
  );
  assert.equal(wrongSecret.status, 401);

  // Giltig signatur passerar verifieringen. Utanför Next.js kastar
  // revalidateTag (ingen request-kontext) — det räcker att vi inte får 401.
  for (const handler of [
    createRevalidateHandler({ apiKey: KEY }),
    createRevalidateHandler({ secret: "hemligt" }),
  ]) {
    const signedBody = payload(ts, { secret: "hemligt" });
    try {
      const res = await handler(
        new Request("https://kund.se/x", { method: "POST", body: signedBody, headers: headersFor(ts, `v1=${sign(KEY, ts, signedBody)}`) }),
      );
      assert.equal(res.status, 200);
    } catch (err) {
      // Kastas först i revalidateTag, dvs. efter godkänd verifiering.
      assert.match(String(err), /revalidateTag/);
    }
  }
});

test("klient: URL:er med och utan CMS_SITE", async () => {
  const calls = [];
  const fakeFetch = async (url, init) => {
    calls.push({ url, init });
    const path = new URL(url).pathname;
    const data = path.endsWith("/posts") ? { posts: [] } : path.includes("/posts/") ? { post: { slug: "x" } } : { ok: true };
    return new Response(JSON.stringify(data), { status: 200, headers: { "content-type": "application/json" } });
  };

  // Bara nyckel → https://sitecms.se/api/v1/site/...
  const keyOnly = createSitecms({ apiKey: KEY, fetch: fakeFetch });
  await keyOnly.getContent();
  await keyOnly.getPosts();
  await keyOnly.getPost("hej då");
  await keyOnly.health();
  assert.deepEqual(
    calls.map((c) => c.url),
    [
      "https://sitecms.se/api/v1/site/content",
      "https://sitecms.se/api/v1/site/posts",
      "https://sitecms.se/api/v1/site/posts/hej%20d%C3%A5",
      "https://sitecms.se/api/v1/site/health",
    ],
  );
  assert.equal(calls[0].init.headers["x-api-key"], KEY);
  assert.deepEqual(calls[0].init.next, { tags: ["sitecms"] });

  // Som 0.2.x: alla tre angivna → slug-routes, oförändrade URL:er.
  calls.length = 0;
  const legacy = createSitecms({ apiUrl: "https://sitecms-zeta.vercel.app/", site: "jj-bygg", apiKey: KEY, fetch: fakeFetch });
  await legacy.getContent();
  await legacy.getPost("a/b");
  assert.deepEqual(
    calls.map((c) => c.url),
    ["https://sitecms-zeta.vercel.app/api/v1/sites/jj-bygg/content", "https://sitecms-zeta.vercel.app/api/v1/sites/jj-bygg/posts/a%2Fb"],
  );

  // Från miljön (CMS_SITE + CMS_API_URL).
  calls.length = 0;
  process.env.CMS_API_KEY = KEY;
  process.env.CMS_SITE = "norrhed";
  process.env.CMS_API_URL = "http://localhost:3000";
  try {
    await createSitecms({ fetch: fakeFetch }).getContent();
    delete process.env.CMS_SITE;
    await createSitecms({ fetch: fakeFetch }).getContent();
  } finally {
    delete process.env.CMS_API_KEY;
    delete process.env.CMS_SITE;
    delete process.env.CMS_API_URL;
  }
  assert.deepEqual(
    calls.map((c) => c.url),
    ["http://localhost:3000/api/v1/sites/norrhed/content", "http://localhost:3000/api/v1/site/content"],
  );

  assert.throws(() => createSitecms({ fetch: fakeFetch }), /apiKey saknas/);
  assert.equal(apiBase(undefined), "https://sitecms.se/api/v1/site");
  assert.equal(apiBase("", "a b"), "https://sitecms.se/api/v1/sites/a%20b");
});

test("verifyWebhookDetailed: orsaker, och klockfel skiljs från fel nyckel", async () => {
  const ts = nowSeconds();
  const body = payload(ts);
  const good = await verifyWebhookDetailed({ rawBody: body, headers: headersFor(ts, `v1=${sign(KEY, ts, body)}`), apiKey: KEY });
  assert.deepEqual(good, { ok: true, method: "signature" });

  // Rätt signatur, men 10 min gammal → timestamp-out-of-range med avvikelsen.
  const old = ts - 600;
  const oldBody = payload(old);
  const skew = await verifyWebhookDetailed({ rawBody: oldBody, headers: headersFor(old, `v1=${sign(KEY, old, oldBody)}`), apiKey: KEY });
  assert.equal(skew.ok, false);
  assert.equal(skew.reason, "timestamp-out-of-range");
  assert.ok(skew.skewSeconds >= 600 && skew.skewSeconds < 610, String(skew.skewSeconds));
  assert.match(skew.message, /tidsstämpeln ligger utanför ±5 min/);
  assert.match(skew.message, /kontrollera serverns klocka/);
  // Klockan före: negativ avvikelse.
  const future = ts + 900;
  const futureBody = payload(future);
  const ahead = await verifyWebhookDetailed({ rawBody: futureBody, headers: headersFor(future, `v1=${sign(KEY, future, futureBody)}`), apiKey: KEY });
  assert.equal(ahead.reason, "timestamp-out-of-range");
  assert.ok(ahead.skewSeconds <= -890);

  // Fel nyckel och gammal tidsstämpel → invalid-signature (inte klockfel).
  const wrongOld = await verifyWebhookDetailed({ rawBody: oldBody, headers: headersFor(old, `v1=${sign(OTHER_KEY, old, oldBody)}`), apiKey: KEY });
  assert.equal(wrongOld.reason, "invalid-signature");

  const noSig = await verifyWebhookDetailed({ rawBody: body, headers: new Headers(), apiKey: KEY });
  assert.equal(noSig.reason, "missing-signature");
  const badTs = await verifyWebhookDetailed({ rawBody: body, headers: headersFor("abc", "v1=00"), apiKey: KEY });
  assert.equal(badTs.reason, "invalid-timestamp");
  const none = await verifyWebhookDetailed({ rawBody: body, headers: new Headers(), apiKey: "", legacySecret: "" });
  assert.equal(none.reason, "no-credentials");

  // Legacy-hemlighet godkänns även vid klockfel (som förut).
  const legacyBody = payload(old, { secret: "hemligt" });
  const legacy = await verifyWebhookDetailed({
    rawBody: legacyBody,
    headers: headersFor(old, `v1=${sign(KEY, old, legacyBody)}`),
    apiKey: KEY,
    legacySecret: "hemligt",
  });
  assert.deepEqual(legacy, { ok: true, method: "secret" });

  // verifyWebhook är fortfarande en boolean.
  assert.equal(await verifyWebhook({ rawBody: oldBody, headers: headersFor(old, `v1=${sign(KEY, old, oldBody)}`), apiKey: KEY }), false);
});

test("revalidate-route: klockfel ger tydligt felmeddelande", async () => {
  const old = nowSeconds() - 420;
  const body = payload(old);
  const res = await createRevalidateHandler({ apiKey: KEY })(
    new Request("https://kund.se/api/sitecms/revalidate", { method: "POST", body, headers: headersFor(old, `v1=${sign(KEY, old, body)}`) }),
  );
  assert.equal(res.status, 401);
  const json = await res.json();
  assert.equal(json.revalidated, false);
  assert.equal(json.reason, "timestamp-out-of-range");
  assert.match(json.error, /tidsstämpeln ligger utanför ±5 min/);
  assert.match(json.error, /kontrollera serverns klocka/);

  // Fel nyckel: samma meddelande som tidigare.
  const wrong = await createRevalidateHandler({ apiKey: KEY })(
    new Request("https://kund.se/x", { method: "POST", body, headers: headersFor(old, `v1=${sign(OTHER_KEY, old, body)}`) }),
  );
  assert.equal((await wrong.json()).error, "Ogiltig signatur eller hemlighet (kontrollera CMS_API_KEY).");
});

test("createSitecms: explicit apiKey utan site ignorerar CMS_SITE; utan argument som 0.2", async () => {
  const calls = [];
  const fakeFetch = async (url) => {
    calls.push(url);
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  };
  process.env.CMS_API_KEY = KEY;
  process.env.CMS_SITE = "norrhed";
  process.env.CMS_API_URL = "https://sitecms-zeta.vercel.app";
  const realFetch = globalThis.fetch;
  try {
    // 0.2: allt från miljön → slug-routes.
    await createSitecms({ fetch: fakeFetch }).getContent();
    // Ny nyckel för en annan sajt → nyckel-routes (CMS_SITE från miljön ignoreras, CMS_API_URL används).
    await createSitecms({ apiKey: OTHER_KEY, fetch: fakeFetch }).getContent();
    // Explicit site → slug-routes som förut.
    await createSitecms({ apiKey: OTHER_KEY, site: "annan", fetch: fakeFetch }).getContent();
    // Explicit tom site → nyckel-routes.
    await createSitecms({ site: "", fetch: fakeFetch }).getContent();
    // Standardklienten (getContent utan klient) → som 0.2.
    globalThis.fetch = fakeFetch;
    await getContent();
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.CMS_API_KEY;
    delete process.env.CMS_SITE;
    delete process.env.CMS_API_URL;
  }
  assert.deepEqual(calls, [
    "https://sitecms-zeta.vercel.app/api/v1/sites/norrhed/content",
    "https://sitecms-zeta.vercel.app/api/v1/site/content",
    "https://sitecms-zeta.vercel.app/api/v1/sites/annan/content",
    "https://sitecms-zeta.vercel.app/api/v1/site/content",
    "https://sitecms-zeta.vercel.app/api/v1/sites/norrhed/content",
  ]);
});
