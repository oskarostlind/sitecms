// Tester för offertförfrågningar: submitQuoteRequest, uploadQuoteAttachment
// och hashIp (mot dist/, kör `npm test`). fetch mockas — ingen nätverkstrafik.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { SitecmsError, createSitecms, hashIp, submitQuoteRequest, uploadQuoteAttachment } from "../dist/index.js";

delete process.env.CMS_API_KEY;
delete process.env.CMS_SITE;
delete process.env.CMS_API_URL;

const KEY = "sk_test_offert";
const API = "https://cms.example.se";

const INPUT = {
  name: "Anna Andersson",
  phone: "070-123 45 67",
  email: "anna@example.se",
  jobType: "Takbyte",
  description: "Byta tak på villa, ca 120 kvm.",
  consent: true,
  customerType: "privat",
  rot: true,
  postalCode: "972 31",
  extra: { takyta: "120 kvm" },
  ipHash: "a".repeat(64),
};

/** fetch-mock som spelar in anropet och svarar med given status/body. */
function mockFetch(status, body, { headers = { "content-type": "application/json" } } = {}) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(body === undefined ? null : typeof body === "string" ? body : JSON.stringify(body), { status, headers });
  };
  return { fetch, calls };
}

function clientWith(fetch) {
  return createSitecms({ apiKey: KEY, apiUrl: API, fetch, previewToken: false });
}

test("submitQuoteRequest: 201 → { id, emailStatus }, POST med x-api-key, JSON och no-store", async () => {
  const { fetch, calls } = mockFetch(201, { id: "q-1", emailStatus: "sent" });
  const result = await clientWith(fetch).submitQuoteRequest(INPUT);
  assert.deepEqual(result, { id: "q-1", emailStatus: "sent" });

  assert.equal(calls.length, 1);
  const [{ url, init }] = calls;
  assert.equal(url, `${API}/api/v1/site/quote-requests`);
  assert.equal(init.method, "POST");
  assert.equal(init.cache, "no-store");
  assert.equal(init.headers["x-api-key"], KEY);
  assert.equal(init.headers["content-type"], "application/json");
  assert.deepEqual(JSON.parse(init.body), INPUT);
});

test("submitQuoteRequest: slug-klient använder /api/v1/sites/<slug>/quote-requests", async () => {
  const { fetch, calls } = mockFetch(201, { id: "q-2", emailStatus: "skipped" });
  await createSitecms({ apiKey: KEY, apiUrl: API, site: "kund", fetch, previewToken: false }).submitQuoteRequest(INPUT);
  assert.equal(calls[0].url, `${API}/api/v1/sites/kund/quote-requests`);
});

test("submitQuoteRequest: 400 → SitecmsError med status 400 och fields", async () => {
  const fields = { phone: "Ange ett svenskt telefonnummer, t.ex. 070-123 45 67.", consent: "Du behöver godkänna att vi behandlar dina uppgifter." };
  const { fetch } = mockFetch(400, { error: "Valideringsfel.", fields });
  await assert.rejects(
    () => clientWith(fetch).submitQuoteRequest({ ...INPUT, phone: "x", consent: false }),
    (err) => {
      assert.ok(err instanceof SitecmsError);
      assert.equal(err.status, 400);
      assert.equal(err.message, "Valideringsfel.");
      assert.deepEqual(err.fields, fields);
      return true;
    },
  );
});

test("submitQuoteRequest: 400 utan fields → tomt fields-objekt", async () => {
  const { fetch } = mockFetch(400, { error: "Ogiltig JSON." });
  await assert.rejects(
    () => clientWith(fetch).submitQuoteRequest(INPUT),
    (err) => err instanceof SitecmsError && err.status === 400 && err.message === "Ogiltig JSON." && Object.keys(err.fields).length === 0,
  );
});

test("submitQuoteRequest: 429 → SitecmsError med status 429 och serverns svenska meddelande", async () => {
  const message = "För många förfrågningar från samma adress. Försök igen om en stund eller ring oss.";
  const { fetch } = mockFetch(429, { error: message });
  await assert.rejects(
    () => clientWith(fetch).submitQuoteRequest(INPUT),
    (err) => err instanceof SitecmsError && err.status === 429 && err.message === message && Object.keys(err.fields).length === 0,
  );
});

test("submitQuoteRequest: 401 → SitecmsError med status 401 (generellt format)", async () => {
  const { fetch } = mockFetch(401, { error: "Ogiltig API-nyckel." });
  await assert.rejects(
    () => clientWith(fetch).submitQuoteRequest(INPUT),
    (err) => err instanceof SitecmsError && err.status === 401 && /Ogiltig API-nyckel/.test(err.message) && /HTTP 401/.test(err.message),
  );
});

test("submitQuoteRequest: nätverksfel → SitecmsError med status 0", async () => {
  const fetch = async () => {
    throw new TypeError("fetch failed");
  };
  await assert.rejects(
    () => clientWith(fetch).submitQuoteRequest(INPUT),
    (err) => err instanceof SitecmsError && err.status === 0 && /kunde inte nå sitecms/.test(err.message) && /fetch failed/.test(err.message),
  );
});

test("submitQuoteRequest: AbortError skickas vidare oförändrat", async () => {
  const fetch = async () => {
    const err = new Error("aborted");
    err.name = "AbortError";
    throw err;
  };
  await assert.rejects(() => clientWith(fetch).submitQuoteRequest(INPUT), (err) => err.name === "AbortError");
});

test("submitQuoteRequest: kastar tydligt fel i webbläsaren (window + document)", async () => {
  const { fetch, calls } = mockFetch(201, { id: "x", emailStatus: "sent" });
  globalThis.window = {};
  globalThis.document = {};
  try {
    await assert.rejects(() => clientWith(fetch).submitQuoteRequest(INPUT), /serversidan/);
    await assert.rejects(() => clientWith(fetch).uploadQuoteAttachment(new Blob(["x"]), "a.pdf"), /serversidan/);
  } finally {
    delete globalThis.window;
    delete globalThis.document;
  }
  assert.equal(calls.length, 0);
});

test("standardexporterna läser CMS_API_KEY/CMS_API_URL", async () => {
  const original = globalThis.fetch;
  process.env.CMS_API_KEY = KEY;
  process.env.CMS_API_URL = API;
  // Standardklienten byggs vid första anropet och behåller fetch, så en mock som
  // svarar olika per URL.
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    const body = url.endsWith("/attachments")
      ? { url: "https://b/x.png", name: "x.png", contentType: "image/png", size: 3 }
      : { id: "q-3", emailStatus: "failed" };
    return new Response(JSON.stringify(body), { status: 201, headers: { "content-type": "application/json" } });
  };
  try {
    const result = await submitQuoteRequest(INPUT);
    assert.equal(result.id, "q-3");
    assert.equal(calls[0].url, `${API}/api/v1/site/quote-requests`);
    assert.equal(calls[0].init.headers["x-api-key"], KEY);
    const uploaded = await uploadQuoteAttachment(new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }), "x.png");
    assert.equal(uploaded.name, "x.png");
    assert.equal(calls[1].url, `${API}/api/v1/site/quote-requests/attachments`);
  } finally {
    globalThis.fetch = original;
    delete process.env.CMS_API_KEY;
    delete process.env.CMS_API_URL;
  }
});

test("uploadQuoteAttachment: multipart med file + ipHash, 201 → QuoteAttachment", async () => {
  const attachment = { url: "https://x.public.blob.vercel-storage.com/quotes/s/u-tomt.jpg", name: "tomt.jpg", contentType: "image/jpeg", size: 3 };
  const { fetch, calls } = mockFetch(201, attachment);
  const file = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" });
  const result = await clientWith(fetch).uploadQuoteAttachment(file, "tomt.jpg", { ipHash: "b".repeat(64) });
  assert.deepEqual(result, attachment);

  const [{ url, init }] = calls;
  assert.equal(url, `${API}/api/v1/site/quote-requests/attachments`);
  assert.equal(init.method, "POST");
  assert.equal(init.cache, "no-store");
  assert.equal(init.headers["x-api-key"], KEY);
  assert.equal(init.headers["content-type"], undefined, "content-type sätts av fetch (multipart boundary)");
  assert.ok(init.body instanceof FormData);
  const sent = init.body.get("file");
  assert.ok(sent instanceof File);
  assert.equal(sent.name, "tomt.jpg");
  assert.equal(sent.type, "image/jpeg");
  assert.equal(sent.size, 3);
  assert.equal(init.body.get("ipHash"), "b".repeat(64));
});

test("uploadQuoteAttachment: contentType-option sätter typ på en typlös blob, utan ipHash skickas inget fält", async () => {
  const { fetch, calls } = mockFetch(201, { url: "https://x/y.pdf", name: "y.pdf", contentType: "application/pdf", size: 5 });
  await clientWith(fetch).uploadQuoteAttachment(new Blob(["%PDF-"]), "ritning.pdf", { contentType: "application/pdf" });
  const sent = calls[0].init.body.get("file");
  assert.equal(sent.type, "application/pdf");
  assert.equal(sent.name, "ritning.pdf");
  assert.equal(calls[0].init.body.get("ipHash"), null);
});

test("uploadQuoteAttachment: 400/413/429 → SitecmsError med serverns meddelande", async () => {
  for (const [status, message] of [
    [400, "Filtypen stöds inte. Använd JPG, PNG, WEBP, HEIC eller PDF."],
    [413, "Filen är för stor. Max 10 MB."],
    [429, "För många uppladdningar från samma adress. Försök igen om en stund."],
  ]) {
    const { fetch } = mockFetch(status, { error: message });
    await assert.rejects(
      () => clientWith(fetch).uploadQuoteAttachment(new Blob(["x"]), "x.bin"),
      (err) => err instanceof SitecmsError && err.status === status && err.message === message,
      String(status),
    );
  }
});

test("uploadQuoteAttachment: nätverksfel → SitecmsError med status 0", async () => {
  const fetch = async () => {
    throw new TypeError("fetch failed");
  };
  await assert.rejects(
    () => clientWith(fetch).uploadQuoteAttachment(new Blob(["x"]), "x.png"),
    (err) => err instanceof SitecmsError && err.status === 0,
  );
});

test("hashIp: SHA-256 hex av `salt:ip`, deterministisk, saltberoende", async () => {
  const expected = createHash("sha256").update("hemligt-salt:203.0.113.7", "utf8").digest("hex");
  assert.equal(await hashIp("203.0.113.7", "hemligt-salt"), expected);
  assert.equal(await hashIp(" 203.0.113.7 ", "hemligt-salt"), expected, "IP trimmas");
  assert.notEqual(await hashIp("203.0.113.7", "annat-salt"), expected);
  assert.notEqual(await hashIp("203.0.113.8", "hemligt-salt"), expected);
  assert.match(await hashIp("2001:db8::1", "s"), /^[a-f0-9]{64}$/);
  // Godkänns av sitecms rate limit-regex (hex, 16–128 tecken).
  assert.match(await hashIp("", ""), /^[a-f0-9]{16,128}$/);
});
