import assert from "node:assert/strict";
import { normalizeSwedishPhone, validateAttachments, validateExtra, validateQuote } from "../lib/quote-validation";

assert.equal(normalizeSwedishPhone("070-123 45 67"), "+46701234567");
assert.equal(normalizeSwedishPhone("0970-553 00"), "+4697055300");
assert.equal(normalizeSwedishPhone("+46 70 123 45 67"), "+46701234567");
assert.equal(normalizeSwedishPhone("0046701234567"), "+46701234567");
assert.equal(normalizeSwedishPhone("12345"), null);
assert.equal(normalizeSwedishPhone("+4412345678"), null);

const valid = {
  name: "Anna Andersson",
  phone: "070-123 45 67",
  email: "anna@example.se",
  jobType: "Transporter",
  description: "Behöver flytta 40 ton grus.",
  consent: true,
};
const ok = validateQuote(valid);
assert.ok(ok.ok);

const bad = validateQuote({ ...valid, name: "A", email: "nope", consent: false, desiredStart: "2000-01-01", description: "kort" });
assert.ok(!bad.ok);
if (!bad.ok) {
  for (const f of ["name", "email", "consent", "desiredStart", "description"]) assert.ok(bad.errors[f], f);
}

// --- v2: bakåtkompatibilitet — utan nya fält blir de null ---
if (ok.ok) {
  assert.deepEqual(
    [ok.data.customerType, ok.data.budget, ok.data.rot, ok.data.postalCode, ok.data.source, ok.data.attachments, ok.data.extra],
    [null, null, null, null, null, null, null],
  );
}

// --- v2: alla nya fält ---
const full = validateQuote({
  ...valid,
  customerType: "foretag",
  budget: "50 000–100 000 kr",
  rot: "true",
  postalCode: " 972 31 ",
  source: "utm_source=google&utm_campaign=var2026",
  attachments: [
    { url: "https://blob.example.com/quotes/a/b-ritning.pdf", name: "ritning.pdf", contentType: "application/pdf", size: 12345 },
    { url: "https://blob.example.com/quotes/a/c-tomt.jpg", name: "tomt.jpg", contentType: "image/jpeg", size: "4096" },
  ],
  extra: { takyta: " 120 kvm ", "antal-vaningar": "2", tom: "   ", nummer: 7 },
});
assert.ok(full.ok, JSON.stringify(full));
if (full.ok) {
  assert.equal(full.data.customerType, "foretag");
  assert.equal(full.data.budget, "50 000–100 000 kr");
  assert.equal(full.data.rot, true);
  assert.equal(full.data.postalCode, "972 31");
  assert.equal(full.data.source, "utm_source=google&utm_campaign=var2026");
  assert.equal(full.data.attachments?.length, 2);
  assert.equal(full.data.attachments?.[1].size, 4096);
  assert.deepEqual(full.data.extra, { takyta: "120 kvm", "antal-vaningar": "2", nummer: "7" });
}

// rot som boolean false ska bevaras (inte bli null)
const rotFalse = validateQuote({ ...valid, rot: false });
assert.ok(rotFalse.ok && rotFalse.data.rot === false);

// --- v2: felaktiga värden ---
const badV2 = validateQuote({
  ...valid,
  customerType: "kommun",
  budget: "x".repeat(101),
  rot: "kanske",
  postalCode: "12345678901",
  source: "s".repeat(501),
  attachments: [{ url: "http://osaker.example.com/fil.pdf", name: "fil.pdf", contentType: "application/pdf", size: 1 }],
  extra: { "ogiltig nyckel!": "v" },
});
assert.ok(!badV2.ok);
if (!badV2.ok) {
  for (const f of ["customerType", "budget", "rot", "postalCode", "source", "attachments", "extra"]) assert.ok(badV2.errors[f], f);
  assert.match(badV2.errors.attachments, /https/);
}

// attachments: för många, för lång URL, saknad size
const tooMany = validateAttachments(Array.from({ length: 11 }, (_, i) => ({ url: `https://x.se/${i}`, name: "f", contentType: "image/png", size: 1 })));
assert.ok(!tooMany.ok);
const tooLong = validateAttachments([{ url: "https://x.se/" + "a".repeat(2048), name: "f", contentType: "image/png", size: 1 }]);
assert.ok(!tooLong.ok);
const noSize = validateAttachments([{ url: "https://x.se/f.png", name: "f", contentType: "image/png" }]);
assert.ok(!noSize.ok);
assert.deepEqual(validateAttachments([]), { ok: true, data: null });
assert.deepEqual(validateAttachments(undefined), { ok: true, data: null });

// extra: max 20 nycklar, för långt värde, tomma värden kastas, tomt objekt → null
const twentyOne = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`k${i}`, "v"]));
assert.ok(!validateExtra(twentyOne).ok);
const twenty = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`k${i}`, "v"]));
assert.ok(validateExtra(twenty).ok);
assert.ok(!validateExtra({ a: "v".repeat(501) }).ok);
assert.deepEqual(validateExtra({ a: "", b: "  " }), { ok: true, data: null });
assert.deepEqual(validateExtra({}), { ok: true, data: null });
assert.ok(!validateExtra(["a"]).ok);
assert.ok(!validateExtra({ a: { nested: true } }).ok);

console.log("quote-validation: alla tester gick igenom");
