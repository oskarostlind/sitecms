import assert from "node:assert/strict";
import { normalizeSwedishPhone, validateQuote } from "../lib/quote-validation";

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
console.log("quote-validation: alla tester gick igenom");
