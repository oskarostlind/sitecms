/**
 * Tester för lib/webhook-url.ts (origin-validering för siteUrl i schema-sync,
 * standard-revalidate-URL från domän, validering när revalidate-URL sparas,
 * maskering och tvätt av URL:er i felmeddelanden).
 *
 *   npx tsx scripts/webhook-url-test.ts
 */
import assert from "node:assert/strict";
import {
  errorForLog,
  maskRevalidateUrl,
  normalizeDomain,
  publicHttpsOrigin,
  redactUrls,
  revalidateUrlProblem,
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

// Validering av en ny revalidate-URL i panelen (http tillåts, interna adresser inte).
assert.equal(revalidateUrlProblem("https://kund.se/api/sitecms/revalidate"), null);
assert.equal(revalidateUrlProblem("http://kund.se/api/sitecms/revalidate"), null);
assert.equal(revalidateUrlProblem("  https://api.netlify.com/build_hooks/abc123?x=1 "), null);
assert.equal(revalidateUrlProblem("https://8.8.8.8/hook"), null);
for (const bad of ["", "   ", "kund.se/api", "ftp://kund.se", "javascript:alert(1)", "not a url", "https://"]) {
  assert.equal(revalidateUrlProblem(bad), "revalidate-url-invalid", `ogiltig: ${bad}`);
}
for (const bad of ["https://user:pass@kund.se/x", "https://user@kund.se/x", "http://:pw@kund.se"]) {
  assert.equal(revalidateUrlProblem(bad), "revalidate-url-credentials", `inloggning: ${bad}`);
}
for (const bad of [
  "http://localhost:3000/api/sitecms/revalidate",
  "https://127.0.0.1/x",
  "http://10.1.2.3/x",
  "http://192.168.0.10/x",
  "http://169.254.169.254/latest/meta-data",
  "http://[::1]/x",
  "http://[fd00::1]/x",
  "http://intranet/x",
  "http://app.local/x",
  "http://0x7f000001/x", // WHATWG-URL normaliserar till 127.0.0.1
  "http://2130706433/x",
]) {
  assert.equal(revalidateUrlProblem(bad), "revalidate-url-internal", `intern: ${bad}`);
}

// Maskering (health, schema-svaret, aktivitetslogg).
assert.equal(maskRevalidateUrl(null), null);
assert.equal(maskRevalidateUrl(undefined), null);
assert.equal(maskRevalidateUrl(""), null);
assert.equal(maskRevalidateUrl("https://kund.se/api/sitecms/revalidate"), "https://kund.se/api/sitecms/revalidate");
assert.equal(
  maskRevalidateUrl("https://www.kund.se/api/sitecms/revalidate?token=hemligt#x"),
  "https://www.kund.se/api/sitecms/revalidate",
);
assert.equal(maskRevalidateUrl("http://kund.se:8080/api/sitecms/revalidate"), "http://kund.se:8080/api/sitecms/revalidate");
assert.equal(maskRevalidateUrl("https://api.netlify.com/build_hooks/abc123"), "https://api.netlify.com/••••");
assert.equal(
  maskRevalidateUrl("https://api.vercel.com/v1/integrations/deploy/prj_x/abc"),
  "https://api.vercel.com/••••",
);
assert.equal(maskRevalidateUrl("https://user:pass@kund.se/api/sitecms/revalidate"), "https://kund.se/api/sitecms/revalidate");
assert.equal(maskRevalidateUrl("https://user:pass@kund.se/hook"), "https://kund.se/••••");
assert.equal(maskRevalidateUrl("https://kund.se/api/sitecms/revalidate/"), "https://kund.se/••••");
assert.equal(maskRevalidateUrl("https://kund.se"), "https://kund.se/••••");
assert.equal(maskRevalidateUrl("inte en url"), "••••");
assert.equal(maskRevalidateUrl("ftp://kund.se/x"), "••••");

// Tvätt av fritext (last_webhook_error, ?detail=, loggar).
assert.equal(redactUrls("Svarade HTTP 404."), "Svarade HTTP 404.");
assert.equal(
  redactUrls("Failed to parse URL from https://user:pass@kund.se/hook?token=abc"),
  "Failed to parse URL from https://kund.se/••••",
);
assert.equal(
  redactUrls("fel mot https://kund.se/api/sitecms/revalidate?secret=x."),
  "fel mot https://kund.se/api/sitecms/revalidate.",
);
assert.equal(
  redactUrls('a "https://api.netlify.com/build_hooks/abc" b http://x.se/y?z=1, c'),
  'a "https://api.netlify.com/••••" b http://x.se/••••, c',
);
assert.equal(redactUrls("redirect to ftp://user:pw@host/fil"), "redirect to ftp://••••");
assert.equal(redactUrls("trasig https://[::1"), "trasig https://••••");
for (const secret of ["pass", "token=abc", "build_hooks", "abc123"]) {
  const text = redactUrls(`x https://user:pass@h.se/build_hooks/abc123?token=abc y`);
  assert.ok(!text.includes(secret), `"${secret}" får inte finnas kvar i: ${text}`);
}
const logged = errorForLog(
  Object.assign(new TypeError("fetch failed"), { cause: new Error("connect to https://u:p@h.se/hook?k=v failed") }),
);
assert.ok(!logged.includes("u:p") && !logged.includes("k=v") && !logged.includes("/hook"), logged);
assert.ok(logged.startsWith("TypeError: fetch failed"), logged);

console.log("webhook-url: alla tester gick igenom");
