/**
 * Verifierar den signerade webhooken (lib/webhook.ts) med en OBEROENDE
 * implementation via Web Crypto — samma algoritm som en mottagare
 * (sitecms-next) använder: HMAC-nyckel = UTF-8-bytes för sha256hex(apiKey),
 * meddelande = `${timestamp}.${rawBody}`, jämförelse i konstant tid mot varje
 * v1-post, och |now − timestamp| ≤ 300 s.
 *
 *   npx tsx scripts/webhook-signature-test.ts
 */
import assert from "node:assert/strict";
import { buildWebhookRequest, WEBHOOK_TOLERANCE_SECONDS } from "../lib/webhook";
import { generateApiKey, hashApiKey } from "../lib/api-keys";

const subtle = globalThis.crypto.subtle;
const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string): Promise<string> {
  return toHex(await subtle.digest("SHA-256", enc.encode(value)));
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Mottagarens verifiering, skriven från kontraktet — inte från lib/webhook.ts. */
async function receiverVerify(
  apiKey: string,
  rawBody: string,
  headers: Record<string, string>,
  nowSeconds: number,
): Promise<boolean> {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  const tsHeader = lower["x-sitecms-timestamp"];
  const sigHeader = lower["x-sitecms-signature"];
  if (!tsHeader || !sigHeader || !/^\d+$/.test(tsHeader)) return false;
  const ts = Number(tsHeader);
  if (Math.abs(nowSeconds - ts) > 300) return false;

  const keyHex = await sha256Hex(apiKey);
  const key = await subtle.importKey("raw", enc.encode(keyHex), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = toHex(await subtle.sign("HMAC", key, enc.encode(`${ts}.${rawBody}`)));

  let ok = false;
  for (const part of sigHeader.split(",")) {
    const [scheme, value] = part.trim().split("=", 2);
    if (scheme === "v1" && value && timingSafeEqualHex(value, expected)) ok = true;
  }
  return ok;
}

async function main() {
  const keyA = generateApiKey();
  const keyB = generateApiKey();
  const keyC = generateApiKey(); // tillhör inte sajten
  const now = new Date("2026-10-21T12:00:00Z");
  const nowSeconds = Math.floor(now.getTime() / 1000);

  // Oberoende sha256 stämmer med lib/api-keys (= api_keys.key_hash).
  assert.equal(await sha256Hex(keyA), hashApiKey(keyA));

  // --- Två nycklar, ingen legacy-hemlighet
  const req = buildWebhookRequest({ slug: "jjbyggboden", keyHashes: [hashApiKey(keyA), hashApiKey(keyB)], now });
  const body = JSON.parse(req.body);
  assert.deepEqual(body, { event: "content.updated", site: "jjbyggboden", timestamp: nowSeconds });
  assert.equal("secret" in body, false, "secret ska inte finnas utan revalidateSecret");
  assert.equal(req.timestamp, nowSeconds);
  assert.equal(req.headers["x-sitecms-timestamp"], String(nowSeconds));
  assert.equal(req.headers["content-type"], "application/json");
  assert.equal(req.headers["user-agent"], "sitecms-webhook");
  assert.match(req.headers["x-sitecms-signature"], /^v1=[0-9a-f]{64},v1=[0-9a-f]{64}$/);

  assert.ok(await receiverVerify(keyA, req.body, req.headers, nowSeconds), "nyckel A ska verifiera");
  assert.ok(await receiverVerify(keyB, req.body, req.headers, nowSeconds), "nyckel B ska verifiera");
  assert.ok(!(await receiverVerify(keyC, req.body, req.headers, nowSeconds)), "fel nyckel ska avvisas");

  // Manipulerad body / tidsstämpel avvisas.
  const tampered = req.body.replace("jjbyggboden", "annan-sajt");
  assert.ok(!(await receiverVerify(keyA, tampered, req.headers, nowSeconds)), "ändrad body ska avvisas");
  const shiftedTs = { ...req.headers, "x-sitecms-timestamp": String(nowSeconds - 1) };
  assert.ok(!(await receiverVerify(keyA, req.body, shiftedTs, nowSeconds)), "ändrad tidsstämpel ska avvisas");

  // Tidsfönster: ±300 s godkänns, utanför avvisas.
  assert.equal(WEBHOOK_TOLERANCE_SECONDS, 300);
  assert.ok(await receiverVerify(keyA, req.body, req.headers, nowSeconds + 300));
  assert.ok(!(await receiverVerify(keyA, req.body, req.headers, nowSeconds + 301)), "för gammal ska avvisas");
  assert.ok(!(await receiverVerify(keyA, req.body, req.headers, nowSeconds - 301)), "från framtiden ska avvisas");

  // --- En nyckel + legacy-hemlighet: secret med i bodyn, signaturen täcker den.
  const legacy = buildWebhookRequest({
    slug: "norrhed-skog",
    secret: "a".repeat(48),
    keyHashes: [hashApiKey(keyA)],
    now,
  });
  const legacyBody = JSON.parse(legacy.body);
  assert.equal(legacyBody.secret, "a".repeat(48), "secret ska skickas när sajten har en hemlighet");
  assert.deepEqual(Object.keys(legacyBody), ["event", "site", "timestamp", "secret"]);
  assert.match(legacy.headers["x-sitecms-signature"], /^v1=[0-9a-f]{64}$/);
  assert.ok(await receiverVerify(keyA, legacy.body, legacy.headers, nowSeconds));
  assert.ok(!(await receiverVerify(keyB, legacy.body, legacy.headers, nowSeconds)));
  // Gammal mottagare: body.secret === CMS_REVALIDATE_SECRET fungerar oförändrat.
  assert.equal(JSON.parse(legacy.body).secret === "a".repeat(48), true);

  // Tom/null hemlighet → ingen secret.
  for (const secret of [null, undefined, ""]) {
    const r = buildWebhookRequest({ slug: "x", secret, keyHashes: [hashApiKey(keyA)], now });
    assert.equal("secret" in JSON.parse(r.body), false, `secret=${String(secret)} ska utelämnas`);
  }

  // --- Inga nycklar: ingen signatur-header (mottagaren kan bara använda legacy-hemligheten).
  const none = buildWebhookRequest({ slug: "x", secret: "s", keyHashes: [], now });
  assert.equal(none.headers["x-sitecms-signature"], undefined);
  assert.ok(!(await receiverVerify(keyA, none.body, none.headers, nowSeconds)));

  // Dubbletter ger en post per unik nyckel.
  const dup = buildWebhookRequest({ slug: "x", keyHashes: [hashApiKey(keyA), hashApiKey(keyA)], now });
  assert.equal(dup.headers["x-sitecms-signature"].split(",").length, 1);

  // Default-tid = nu.
  const live = buildWebhookRequest({ slug: "x", keyHashes: [hashApiKey(keyA)] });
  assert.ok(Math.abs(live.timestamp - Math.floor(Date.now() / 1000)) <= 1);
  assert.ok(await receiverVerify(keyA, live.body, live.headers, Math.floor(Date.now() / 1000)));

  console.log("webhook-signature: alla tester gick igenom");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
