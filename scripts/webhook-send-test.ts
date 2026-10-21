/**
 * Tester för lib/webhook-http.ts: IP-klassificering (SSRF-skydd), DNS-
 * kontroll, egna omdirigeringar (jämförs mot fetch-follow, som sitecms
 * använde tidigare) mot en lokal node:http-server, timeout och felhintar.
 *
 *   npx tsx scripts/webhook-send-test.ts
 *
 * Testservern lyssnar på localhost. Den riktiga mål-kontrollen avvisar
 * localhost, så testerna injicerar en kontroll som släpper igenom just
 * "localhost" och skickar allt annat (t.ex. en omdirigering till 127.0.0.1)
 * till den riktiga kontrollen — utan DNS.
 */
import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { buildWebhookRequest } from "../lib/webhook";
import {
  assertPublicTarget,
  describeHttpStatus,
  ERROR_CREDENTIALS,
  ERROR_INTERNAL,
  ERROR_TOO_MANY_REDIRECTS,
  isInternalAddress,
  MAX_WEBHOOK_REDIRECTS,
  postWebhook,
  sendWebhookHttp,
  WebhookTargetError,
  type TargetCheck,
} from "../lib/webhook-http";

async function main(): Promise<void> {
// ---------------------------------------------------------------------------
// IP-klassificering
// ---------------------------------------------------------------------------

const internal = [
  "0.0.0.0",
  "0.1.2.3",
  "10.0.0.1",
  "10.255.255.255",
  "100.64.0.1",
  "100.127.255.254",
  "127.0.0.1",
  "127.1.2.3",
  "169.254.169.254",
  "172.16.0.1",
  "172.31.255.255",
  "192.168.1.1",
  "192.0.0.8",
  "192.0.2.1",
  "198.18.0.1",
  "198.51.100.7",
  "203.0.113.9",
  "224.0.0.1",
  "239.255.255.250",
  "240.0.0.1",
  "255.255.255.255",
  "::",
  "::1",
  "[::1]",
  "0:0:0:0:0:0:0:1",
  "::ffff:127.0.0.1",
  "::ffff:7f00:1",
  "::ffff:10.0.0.1",
  "::ffff:169.254.169.254",
  "::ffff:a9fe:a9fe",
  "::127.0.0.1",
  "64:ff9b::7f00:1",
  "64:ff9b::10.0.0.1",
  "2002:7f00:0001::1",
  "2002:c0a8:0101::1",
  "fc00::1",
  "fd12:3456:789a::1",
  "fe80::1",
  "fe80::1%eth0",
  "febf::1",
  "fec0::1",
  "ff02::1",
  "ff05::1:3",
  "2001:db8::1",
  "100::1",
  // Går inte att tolka → fail closed.
  "",
  "inte-en-ip",
  "1.2.3",
  "300.1.1.1",
  "1:2:3:4:5:6:7:8:9",
  "1::2::3",
  "gggg::1",
];
for (const address of internal) {
  assert.equal(isInternalAddress(address), true, `ska vara intern: ${JSON.stringify(address)}`);
}

const publicAddresses = [
  "8.8.8.8",
  "1.1.1.1",
  "93.184.216.34",
  "100.63.255.255",
  "100.128.0.1",
  "172.15.255.255",
  "172.32.0.1",
  "169.253.0.1",
  "192.169.0.1",
  "198.17.255.255",
  "198.20.0.1",
  "223.255.255.255",
  "2606:4700:4700::1111",
  "2001:4860:4860::8888",
  "[2a00:1450:4001:80b::200e]",
  "::ffff:8.8.8.8",
  "::ffff:808:808",
  "64:ff9b::808:808",
  "2002:0808:0808::1",
  "2001:db9::1",
  "fbff::1",
];
for (const address of publicAddresses) {
  assert.equal(isInternalAddress(address), false, `ska vara publik: ${address}`);
}

// ---------------------------------------------------------------------------
// Mål-kontroll med injicerad DNS
// ---------------------------------------------------------------------------

async function rejectsWith(promise: Promise<unknown>, message: string, label: string) {
  await assert.rejects(promise, (err: unknown) => {
    assert.ok(err instanceof WebhookTargetError, `${label}: fel typ ${String(err)}`);
    assert.equal(err.message, message, label);
    return true;
  });
}

const fakeDns = (map: Record<string, string[]>) => async (host: string) => {
  if (!(host in map)) throw Object.assign(new Error(`getaddrinfo ENOTFOUND ${host}`), { code: "ENOTFOUND" });
  return map[host];
};
const dns = fakeDns({
  "kund.se": ["93.184.216.34"],
  "dual.kund.se": ["93.184.216.34", "2606:4700::1"],
  "rebind.kund.se": ["93.184.216.34", "127.0.0.1"],
  "intern.kund.se": ["10.0.0.5"],
  "v6intern.kund.se": ["fd00::1"],
  "mapped.kund.se": ["::ffff:169.254.169.254"],
  "metadata.kund.se": ["169.254.169.254"],
  "tom.kund.se": [],
});

await assertPublicTarget(new URL("https://kund.se/api/sitecms/revalidate"), { resolveHost: dns });
await assertPublicTarget(new URL("http://kund.se/x"), { resolveHost: dns }); // http tillåts
await assertPublicTarget(new URL("https://dual.kund.se/"), { resolveHost: dns });
await assertPublicTarget(new URL("https://8.8.8.8/hook"), { resolveHost: dns }); // IP-literal, ingen DNS
await assertPublicTarget(new URL("https://[2606:4700:4700::1111]/hook"), { resolveHost: dns });
for (const [url, label] of [
  ["https://rebind.kund.se/", "en av adresserna intern"],
  ["https://intern.kund.se/", "privat IPv4"],
  ["https://v6intern.kund.se/", "ULA"],
  ["https://mapped.kund.se/", "IPv4-mappad metadata"],
  ["https://metadata.kund.se/", "link-local"],
  ["http://127.0.0.1:3000/x", "loopback-literal"],
  ["http://[::1]/x", "IPv6-loopback-literal"],
  ["http://[::ffff:127.0.0.1]/x", "IPv4-mappad literal"],
  ["http://0x7f000001/x", "hex-IPv4 (normaliseras av URL)"],
  ["http://2130706433/x", "decimal-IPv4"],
  ["http://169.254.169.254/latest/meta-data/", "metadata-literal"],
  ["http://localhost/x", "localhost"],
  ["http://foo.localhost/x", "*.localhost"],
] as const) {
  await rejectsWith(assertPublicTarget(new URL(url), { resolveHost: dns }), ERROR_INTERNAL, label);
}
await rejectsWith(
  assertPublicTarget(new URL("https://user:pass@kund.se/"), { resolveHost: dns }),
  ERROR_CREDENTIALS,
  "inloggningsuppgifter",
);
await assert.rejects(assertPublicTarget(new URL("ftp://kund.se/"), { resolveHost: dns }), WebhookTargetError);
await assert.rejects(assertPublicTarget(new URL("https://finns-inte.se/"), { resolveHost: dns }), { code: "ENOTFOUND" });
await assert.rejects(assertPublicTarget(new URL("https://tom.kund.se/"), { resolveHost: dns }), { code: "ENOTFOUND" });

// ---------------------------------------------------------------------------
// Lokal server för omdirigeringar
// ---------------------------------------------------------------------------

type Recorded = { method: string; path: string; headers: Record<string, string | string[] | undefined>; body: string };
const recorded: Recorded[] = [];

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

let port = 0;
const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const body = await readBody(req);
  const path = req.url ?? "/";
  // /r/<status>/<resten> → <status> med Location: /<resten>
  const redirect = /^\/r\/(\d{3})\/(.*)$/.exec(path);
  if (redirect) {
    res.writeHead(Number(redirect[1]), { location: `/${redirect[2]}` });
    res.end("omdirigerar");
    return;
  }
  if (path === "/echo" || path.startsWith("/echo?")) {
    recorded.push({ method: req.method ?? "", path, headers: { ...req.headers }, body });
    res.writeHead(200, { "content-type": "application/json" });
    res.end('{"revalidated":true}');
    return;
  }
  if (path === "/to-internal") {
    res.writeHead(308, { location: `http://127.0.0.1:${port}/echo` });
    res.end();
    return;
  }
  if (path === "/to-metadata") {
    res.writeHead(302, { location: "http://169.254.169.254/latest/meta-data/" });
    res.end();
    return;
  }
  if (path === "/to-ftp") {
    res.writeHead(302, { location: "ftp://example.com/fil" });
    res.end();
    return;
  }
  if (path === "/to-credentials") {
    res.writeHead(307, { location: `http://user:pass@localhost:${port}/echo` });
    res.end();
    return;
  }
  if (path === "/clock") {
    res.writeHead(401, { "content-type": "application/json" });
    res.end(JSON.stringify({ revalidated: false, error: "Ogiltig eller för gammal signatur", reason: "timestamp-out-of-range" }));
    return;
  }
  if (path === "/bad-signature") {
    res.writeHead(401, { "content-type": "application/json" });
    res.end(JSON.stringify({ revalidated: false, error: "Ogiltig signatur", reason: "invalid-signature" }));
    return;
  }
  if (path === "/html401") {
    res.writeHead(401, { "content-type": "text/html" });
    res.end("<html><body>Unauthorized</body></html>");
    return;
  }
  if (path === "/big401") {
    // Stort felsvar som aldrig avslutas — får inte läsas till slut.
    res.writeHead(401, { "content-type": "application/json" });
    res.write(`{"reason":"${"x".repeat(1024 * 1024)}`);
    return;
  }
  if (path === "/noloc") {
    res.writeHead(302);
    res.end();
    return;
  }
  if (path === "/hang") {
    return; // svarar aldrig
  }
  if (path === "/slow-redirect") {
    setTimeout(() => {
      res.writeHead(308, { location: "/hang" });
      res.end();
    }, 150);
    return;
  }
  const status = /^\/status\/(\d{3})$/.exec(path);
  if (status) {
    res.writeHead(Number(status[1]));
    res.end();
    return;
  }
  res.writeHead(404);
  res.end();
});

await new Promise<void>((resolve) => server.listen(0, "localhost", resolve));
port = (server.address() as AddressInfo).port;
const base = `http://localhost:${port}`;

/** Testkontroll: testservern (localhost) släpps igenom, allt annat kontrolleras på riktigt (utan DNS). */
const testCheck: TargetCheck = async (url, signal) => {
  if (url.hostname === "localhost") return;
  await assertPublicTarget(url, {
    signal,
    resolveHost: async (host) => {
      throw Object.assign(new Error(`getaddrinfo ENOTFOUND ${host}`), { code: "ENOTFOUND" });
    },
  });
};

const webhook = buildWebhookRequest({
  slug: "jjbygg",
  secret: "legacy-hemlighet",
  keyHashes: ["a".repeat(64), "b".repeat(64)],
});
const request = { method: "POST", headers: webhook.headers, body: webhook.body };

function last(): Recorded {
  const r = recorded.at(-1);
  assert.ok(r, "servern tog inte emot något anrop");
  return r;
}

try {
  // Direkt anrop: POST med exakt body (inkl. secret) och headers.
  recorded.length = 0;
  {
    const { response, redirected } = await sendWebhookHttp(new URL(`${base}/echo`), request, {
      timeoutMs: 5000,
      checkTarget: testCheck,
    });
    assert.equal(response.status, 200);
    assert.equal(redirected, false);
    const r = last();
    assert.equal(r.method, "POST");
    assert.equal(r.body, webhook.body);
    assert.equal(JSON.parse(r.body).secret, "legacy-hemlighet");
    assert.equal(r.headers["content-type"], "application/json");
    assert.equal(r.headers["user-agent"], "sitecms-webhook");
    assert.equal(r.headers["x-sitecms-timestamp"], webhook.headers["x-sitecms-timestamp"]);
    assert.equal(r.headers["x-sitecms-signature"], webhook.headers["x-sitecms-signature"]);
  }

  // Varje omdirigeringstyp: samma resultat som fetch(..., { redirect: "follow" }) — det tidigare beteendet.
  for (const status of [301, 302, 303, 307, 308]) {
    recorded.length = 0;
    const viaFetch = await fetch(`${base}/r/${status}/echo`, {
      method: "POST",
      headers: webhook.headers,
      body: webhook.body,
      redirect: "follow",
    });
    await viaFetch.body?.cancel();
    assert.equal(viaFetch.status, 200);
    assert.equal(viaFetch.redirected, true);
    const expected = last();

    recorded.length = 0;
    const ours = await sendWebhookHttp(new URL(`${base}/r/${status}/echo`), request, {
      timeoutMs: 5000,
      checkTarget: testCheck,
    });
    await ours.response.body?.cancel();
    assert.equal(ours.response.status, 200, `HTTP ${status}`);
    assert.equal(ours.redirected, true, `HTTP ${status}`);
    const actual = last();

    assert.deepEqual(actual, expected, `HTTP ${status} ska bete sig exakt som fetch-follow`);
    if (status === 307 || status === 308) {
      assert.equal(actual.method, "POST");
      assert.equal(actual.body, webhook.body);
      assert.equal(actual.headers["content-type"], "application/json");
    } else {
      assert.equal(actual.method, "GET");
      assert.equal(actual.body, "");
      assert.equal(actual.headers["content-type"], undefined);
    }
    // Signaturen och user-agent följer med i alla fall (som med fetch).
    assert.equal(actual.headers["x-sitecms-signature"], webhook.headers["x-sitecms-signature"]);
    assert.equal(actual.headers["user-agent"], "sitecms-webhook");
  }

  // Kedja med tre hopp (max) går igenom: 308 → 307 → 301 (→ GET).
  recorded.length = 0;
  {
    const chain = `${base}/r/308/r/307/r/301/echo`;
    const viaFetch = await fetch(chain, { method: "POST", headers: webhook.headers, body: webhook.body });
    await viaFetch.body?.cancel();
    const expected = last();
    recorded.length = 0;
    const ours = await sendWebhookHttp(new URL(chain), request, { timeoutMs: 5000, checkTarget: testCheck });
    assert.equal(ours.response.status, 200);
    assert.deepEqual(last(), expected);
  }

  // Två 308 (www + avslutande snedstreck) behåller POST + body.
  recorded.length = 0;
  {
    const ours = await sendWebhookHttp(new URL(`${base}/r/308/r/308/echo`), request, {
      timeoutMs: 5000,
      checkTarget: testCheck,
    });
    assert.equal(ours.response.status, 200);
    assert.equal(last().method, "POST");
    assert.equal(last().body, webhook.body);
  }

  // Fyra hopp → för många.
  recorded.length = 0;
  assert.equal(MAX_WEBHOOK_REDIRECTS, 3);
  await rejectsWith(
    sendWebhookHttp(new URL(`${base}/r/308/r/308/r/308/r/308/echo`), request, {
      timeoutMs: 5000,
      checkTarget: testCheck,
    }),
    ERROR_TOO_MANY_REDIRECTS,
    "fyra hopp",
  );
  assert.equal(recorded.length, 0, "det fjärde hoppet får inte anropas");

  // Omdirigering till 127.0.0.1 avvisas — och anropas aldrig.
  recorded.length = 0;
  await rejectsWith(
    sendWebhookHttp(new URL(`${base}/to-internal`), request, { timeoutMs: 5000, checkTarget: testCheck }),
    ERROR_INTERNAL,
    "hopp till 127.0.0.1",
  );
  assert.equal(recorded.length, 0, "127.0.0.1 får inte anropas");
  // Samma sak via en tidigare omdirigering i kedjan.
  await rejectsWith(
    sendWebhookHttp(new URL(`${base}/r/301/to-internal`), request, { timeoutMs: 5000, checkTarget: testCheck }),
    ERROR_INTERNAL,
    "301 → 308 till 127.0.0.1",
  );
  await rejectsWith(
    sendWebhookHttp(new URL(`${base}/to-metadata`), request, { timeoutMs: 5000, checkTarget: testCheck }),
    ERROR_INTERNAL,
    "hopp till metadata-tjänsten",
  );
  await assert.rejects(
    sendWebhookHttp(new URL(`${base}/to-ftp`), request, { timeoutMs: 5000, checkTarget: testCheck }),
    WebhookTargetError,
  );
  await rejectsWith(
    sendWebhookHttp(new URL(`${base}/to-credentials`), request, { timeoutMs: 5000, checkTarget: testCheck }),
    ERROR_CREDENTIALS,
    "hopp med inloggningsuppgifter",
  );
  assert.equal(recorded.length, 0);

  // 3xx utan Location returneras som det är (som fetch).
  {
    const ours = await sendWebhookHttp(new URL(`${base}/noloc`), request, { timeoutMs: 5000, checkTarget: testCheck });
    assert.equal(ours.response.status, 302);
    assert.equal(ours.redirected, false);
  }

  // Den riktiga (default) kontrollen avvisar localhost/127.0.0.1 direkt — även utan testkontroll.
  recorded.length = 0;
  await rejectsWith(sendWebhookHttp(new URL(`${base}/echo`), request, { timeoutMs: 5000 }), ERROR_INTERNAL, "default-kontroll");
  await rejectsWith(
    sendWebhookHttp(new URL(`http://127.0.0.1:${port}/echo`), request, { timeoutMs: 5000 }),
    ERROR_INTERNAL,
    "default-kontroll, literal",
  );
  assert.equal(recorded.length, 0);

  // Timeout gäller hela kedjan (som AbortSignal.timeout med fetch-follow tidigare).
  {
    const started = Date.now();
    await assert.rejects(
      sendWebhookHttp(new URL(`${base}/slow-redirect`), request, { timeoutMs: 400, checkTarget: testCheck }),
      (err: unknown) => err instanceof Error && err.name === "TimeoutError",
    );
    assert.ok(Date.now() - started < 2000, "timeouten ska gälla hela kedjan");
  }

  // postWebhook: utfall och svenska texter.
  const opts = { timeoutMs: 5000, hasCredentials: true, checkTarget: testCheck };
  {
    const ok = await postWebhook(`${base}/r/308/echo`, webhook, opts);
    assert.deepEqual(ok, { ok: true, detail: "Svarade HTTP 200.", httpStatus: 200 });

    const unauthorized = await postWebhook(`${base}/status/401`, webhook, opts);
    assert.equal(unauthorized.ok, false);
    assert.equal(unauthorized.httpStatus, 401);
    assert.match(unauthorized.detail, /CMS_API_KEY/);
    assert.match(unauthorized.detail, /klocka/);
    assert.match(unauthorized.detail, /5 minuter/);
    assert.match(describeHttpStatus(403, true), /klocka/);

    // sitecms-next 0.3: reason "timestamp-out-of-range" → klockfel i stället för nyckel-hinten.
    const clock = await postWebhook(`${base}/clock`, webhook, opts);
    assert.equal(clock.httpStatus, 401);
    assert.equal(
      clock.detail,
      "Svarade HTTP 401. Kundsajtens klocka går fel (mer än 5 min) — signaturen stämmer men tidsstämpeln avvisades.",
    );
    const badSig = await postWebhook(`${base}/bad-signature`, webhook, opts);
    assert.match(badSig.detail, /CMS_API_KEY/);
    const html = await postWebhook(`${base}/html401`, webhook, opts);
    assert.match(html.detail, /CMS_API_KEY/);
    const bigStarted = Date.now();
    const big = await postWebhook(`${base}/big401`, webhook, opts);
    assert.match(big.detail, /CMS_API_KEY/);
    assert.ok(Date.now() - bigStarted < 2000, "stora felsvar ska inte läsas till slut");
    assert.doesNotMatch(describeHttpStatus(401, false), /klocka/);

    const redirectedFail = await postWebhook(`${base}/r/301/status/405`, webhook, opts);
    assert.equal(redirectedFail.httpStatus, 405);
    assert.match(redirectedFail.detail, /omdirigerades/);

    const internalHop = await postWebhook(`${base}/to-internal`, webhook, opts);
    assert.deepEqual(internalHop, { ok: false, detail: ERROR_INTERNAL });

    const timeout = await postWebhook(`${base}/hang`, webhook, { ...opts, timeoutMs: 300 });
    assert.deepEqual(timeout, { ok: false, detail: "Inget svar inom 0.3 sekunder." });

    // Inloggningsuppgifter avvisas innan något skickas.
    let fetchCalls = 0;
    const spy: typeof fetch = async (...args) => {
      fetchCalls++;
      return fetch(...args);
    };
    const creds = await postWebhook(`http://user:hemligt@localhost:${port}/echo?token=x`, webhook, {
      ...opts,
      fetchImpl: spy,
    });
    assert.deepEqual(creds, { ok: false, detail: ERROR_CREDENTIALS });
    assert.equal(fetchCalls, 0);

    const invalid = await postWebhook("inte en url", webhook, opts);
    assert.equal(invalid.ok, false);
    assert.doesNotMatch(invalid.detail, /inte en url/);

    // Okända nätverksfel: meddelandet tvättas från URL:er.
    const failing: typeof fetch = async () => {
      throw new TypeError("Failed to fetch https://user:pw@kund.se/build_hooks/abc?token=hemligt");
    };
    const leaked = await postWebhook(`${base}/echo`, webhook, { ...opts, fetchImpl: failing });
    assert.equal(leaked.ok, false);
    for (const secret of ["user", "pw", "build_hooks", "abc", "token", "hemligt"]) {
      assert.ok(!leaked.detail.includes(secret), `"${secret}" läckte: ${leaked.detail}`);
    }
  }
} finally {
  server.closeAllConnections();
  server.close();
}

console.log("webhook-send: alla tester gick igenom");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
