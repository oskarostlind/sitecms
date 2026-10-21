/**
 * Tester för lib/webhook-url.ts (origin-validering för siteUrl i schema-sync
 * och standard-revalidate-URL från domän).
 *
 *   npx tsx scripts/webhook-url-test.ts
 */
import assert from "node:assert/strict";
import {
  normalizeDomain,
  publicHttpsOrigin,
  revalidateUrlForDomain,
  revalidateUrlFromSiteUrl,
} from "../lib/webhook-url";

// Giltiga publika https-adresser → origin.
assert.equal(publicHttpsOrigin("https://kund.se"), "https://kund.se");
assert.equal(publicHttpsOrigin("https://kund.se/"), "https://kund.se");
assert.equal(publicHttpsOrigin("  https://www.Kund.se/om-oss?x=1#a "), "https://www.kund.se");
assert.equal(publicHttpsOrigin("https://kund.se:8443/x"), "https://kund.se:8443");
assert.equal(publicHttpsOrigin("https://kund-abc123.vercel.app"), "https://kund-abc123.vercel.app");
assert.equal(publicHttpsOrigin("https://8.8.8.8"), "https://8.8.8.8");
assert.equal(publicHttpsOrigin("https://172.32.0.1"), "https://172.32.0.1");
assert.equal(publicHttpsOrigin("https://172.15.0.1"), "https://172.15.0.1");

// http, ogiltigt och fel typ.
for (const bad of [
  "http://kund.se",
  "ftp://kund.se",
  "kund.se",
  "//kund.se",
  "https://",
  "not a url",
  "",
  "   ",
  null,
  undefined,
  42,
  {},
  ["https://kund.se"],
  "https://user:pass@kund.se",
  "javascript:alert(1)",
]) {
  assert.equal(publicHttpsOrigin(bad), null, `ska avvisas: ${JSON.stringify(bad)}`);
}

// localhost, *.local, *.localhost och privata/reserverade nät.
for (const bad of [
  "https://localhost",
  "https://localhost:3000",
  "https://LOCALHOST",
  "https://app.localhost",
  "https://minmac.local",
  "https://127.0.0.1",
  "https://127.1.2.3:3000",
  "https://10.0.0.5",
  "https://192.168.1.10",
  "https://172.16.0.1",
  "https://172.31.255.255",
  "https://169.254.169.254",
  "https://0.0.0.0",
  "https://[::1]",
  "https://[fd00::1]",
  "https://[::ffff:127.0.0.1]",
  "https://intranet",
  "https://localhost.",
]) {
  assert.equal(publicHttpsOrigin(bad), null, `ska avvisas: ${bad}`);
}

assert.deepEqual(revalidateUrlFromSiteUrl("https://www.kund.se/sv/"), {
  revalidateUrl: "https://www.kund.se/api/sitecms/revalidate",
  hostname: "www.kund.se",
});
assert.equal(revalidateUrlFromSiteUrl("http://kund.se"), null);
assert.equal(revalidateUrlFromSiteUrl("https://localhost:3000"), null);
assert.equal(revalidateUrlFromSiteUrl(undefined), null);

// Domän från panelen.
assert.equal(normalizeDomain("https://www.Firma.se/om-oss/"), "www.firma.se");
assert.equal(normalizeDomain("firma.se/"), "firma.se");
assert.equal(normalizeDomain("  http://firma.se?x#y "), "firma.se");
assert.equal(normalizeDomain(null), "");
assert.equal(revalidateUrlForDomain("firma.se"), "https://firma.se/api/sitecms/revalidate");
assert.equal(revalidateUrlForDomain("https://www.firma.se/"), "https://www.firma.se/api/sitecms/revalidate");
assert.equal(revalidateUrlForDomain("http://firma.se/sida"), "https://firma.se/api/sitecms/revalidate");
assert.equal(revalidateUrlForDomain(""), null);
assert.equal(revalidateUrlForDomain(null), null);
assert.equal(revalidateUrlForDomain("localhost:3000"), null);
assert.equal(revalidateUrlForDomain("min firma"), null);
assert.equal(revalidateUrlForDomain("firma"), null);

console.log("webhook-url: alla tester gick igenom");
