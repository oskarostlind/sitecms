/**
 * Browser E2E against production with the synthetic e2e-test customer
 * account. Login happens via the auth API (csrf + credentials callback)
 * through the browser context's shared cookie jar — no password is ever
 * typed into a login field. Verifies the customer editing flows in a
 * real (headless) Chromium.
 */
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE_URL;
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const F = JSON.parse(process.env.FIXTURES); // siteId, pageId, blockId, serviceId, seoId, apiKey
const SHOTS = "/tmp/e2e-shots";
fs.mkdirSync(SHOTS, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const results = [];
let step = 0;

async function shot(page, name) {
  step += 1;
  await page.screenshot({ path: `${SHOTS}/${String(step).padStart(2, "0")}-${name}.png`, fullPage: false });
}

function ok(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`PASS ${name}${detail ? " — " + detail : ""}`);
}

function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.log(`FAIL ${name} — ${detail}`);
}

async function apiLogin(context, email, password) {
  const csrfRes = await context.request.get(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const res = await context.request.post(`${BASE}/api/auth/callback/credentials`, {
    form: { csrfToken, email, password },
    maxRedirects: 0,
  });
  return res.status();
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

try {
  // 1) Programmatic login via auth API (shared cookie jar)
  const loginStatus = await apiLogin(context, EMAIL, PASSWORD);
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  const body = await page.textContent("body");
  if (page.url().includes("/login")) throw new Error(`login failed (status ${loginStatus})`);
  ok("login", `auth-API status ${loginStatus}, /admin renderad`);
  await shot(page, "dashboard");

  // 2) Tenant isolation: customer must not see other sites
  if (body.includes("JJ Bygg") || body.includes("Norrhed")) {
    fail("tenant-isolation", "annan kunds sajt syns i kundvyn");
  } else {
    ok("tenant-isolation", "varken JJ Bygg eller Norrhed syns");
  }

  // 3) Edit text block, save, verify persisted
  const newHero = `E2E hero ${stamp}`;
  await page.goto(`${BASE}/admin/sites/${F.siteId}/pages/${F.pageId}`, { waitUntil: "networkidle" });
  await shot(page, "block-editor");
  const heroField = page.locator("textarea, input[type=text]").first();
  await heroField.fill(newHero);
  await page.getByRole("button", { name: /^Spara$/ }).first().click();
  await page.waitForTimeout(2500);
  await page.reload({ waitUntil: "networkidle" });
  const persisted = await page.locator("textarea, input[type=text]").first().inputValue();
  if (persisted === newHero) ok("block-edit", `sparat värde: "${newHero}"`);
  else fail("block-edit", `förväntade "${newHero}", fick "${persisted}"`);
  await shot(page, "block-saved");

  // 4) Create + publish a post via UI
  const postTitle = `E2E-inlägg ${stamp}`;
  await page.goto(`${BASE}/admin/sites/${F.siteId}/posts/new`, { waitUntil: "networkidle" });
  await page.locator("input[name=title]").fill(postTitle);
  await page.locator("textarea[name=body]").fill("Skapat av browser-E2E. **Kan raderas.**");
  await page.locator("input[name=published]").check();
  await shot(page, "post-form");
  // OBS: sidomenyn har en "Logga ut"-submit — klicka bara i postformuläret
  await page
    .locator("form", { has: page.locator("input[name=title]") })
    .first()
    .locator("button[type=submit]")
    .click();
  await page.waitForTimeout(2500);
  // verify via public content API
  const postsRes = await context.request.get(`${BASE}/api/v1/sites/e2e-test/posts`, {
    headers: { "x-api-key": F.apiKey },
  });
  const postsJson = await postsRes.json();
  const found = JSON.stringify(postsJson).includes(postTitle);
  if (postsRes.status() === 200 && found) ok("post-publish", "inlägget syns i publika API:t");
  else fail("post-publish", `API-status ${postsRes.status()}, hittad: ${found}`);

  // 5) Edit service price via UI, verify persisted
  const newPrice = `Från ${Math.floor(Math.random() * 900) + 100} kr`;
  await page.goto(`${BASE}/admin/sites/${F.siteId}/services`, { waitUntil: "networkidle" });
  const svcForm = page.locator("form", { has: page.locator('input[name=title][value="E2E-tjänst"]') }).first();
  await svcForm.locator("input[name=price]").fill(newPrice);
  await svcForm.locator("button[type=submit]").first().click();
  await page.waitForTimeout(2500);
  await page.reload({ waitUntil: "networkidle" });
  const priceNow = await page
    .locator("form", { has: page.locator('input[name=title][value="E2E-tjänst"]') })
    .first()
    .locator("input[name=price]")
    .inputValue();
  if (priceNow === newPrice) ok("service-edit", `pris sparat: "${newPrice}"`);
  else fail("service-edit", `förväntade "${newPrice}", fick "${priceNow}"`);
  await shot(page, "services");

  // 6) Edit SEO title via UI, verify persisted
  const newSeo = `E2E SEO ${stamp}`;
  await page.goto(`${BASE}/admin/sites/${F.siteId}/seo/${F.seoId}`, { waitUntil: "networkidle" });
  const seoForm = page.locator("form", { has: page.locator("[name=ogImage]") }).first();
  await seoForm.locator("[name=title]").fill(newSeo);
  await seoForm.locator("button[type=submit]").click();
  await page.waitForTimeout(2500);
  await page.goto(`${BASE}/admin/sites/${F.siteId}/seo/${F.seoId}`, { waitUntil: "networkidle" });
  const seoNow = await page.locator("[name=title]").first().inputValue();
  if (seoNow === newSeo) ok("seo-edit", `SEO-titel sparad: "${newSeo}"`);
  else fail("seo-edit", `förväntade "${newSeo}", fick "${seoNow}"`);
  await shot(page, "seo");

  // 7) Change own password via UI (synthetic account — rotation allowed),
  //    then verify old password rejected and new one accepted via auth API.
  const newPassword = `E2e-${stamp}-x`;
  await page.goto(`${BASE}/admin/konto`, { waitUntil: "networkidle" });
  await page.locator("input[name=currentPassword]").fill(PASSWORD);
  await page.locator("input[name=newPassword]").fill(newPassword);
  await page.locator("input[name=confirmPassword]").fill(newPassword);
  await shot(page, "konto");
  await page.getByRole("button", { name: /Spara nytt lösenord/ }).click();
  await page.waitForTimeout(2500);
  const freshCtx = await browser.newContext();
  const oldStatus = await apiLogin(freshCtx, EMAIL, PASSWORD);
  const oldSession = await (await freshCtx.request.get(`${BASE}/api/auth/session`)).json();
  const freshCtx2 = await browser.newContext();
  const newStatus = await apiLogin(freshCtx2, EMAIL, newPassword);
  const newSession = await (await freshCtx2.request.get(`${BASE}/api/auth/session`)).json();
  const oldRejected = !oldSession || !oldSession.user;
  const newAccepted = !!(newSession && newSession.user);
  if (oldRejected && newAccepted)
    ok("password-change", `gammalt nekas (${oldStatus}, ingen session), nytt ger session (${newStatus})`);
  else fail("password-change", `oldRejected=${oldRejected}, newAccepted=${newAccepted}`);
  await freshCtx.close();
  await freshCtx2.close();

  // 8) Mobile viewport sanity on the block editor (375px)
  const mob = await browser.newContext({ viewport: { width: 375, height: 800 } });
  const mp = await mob.newPage();
  await apiLogin(mob, EMAIL, newPassword);
  await mp.goto(`${BASE}/admin/sites/${F.siteId}/pages/${F.pageId}`, { waitUntil: "networkidle" });
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow <= 1) ok("mobile-375", `ingen horisontell overflow (${overflow}px)`);
  else fail("mobile-375", `horisontell overflow ${overflow}px`);
  await mp.screenshot({ path: `${SHOTS}/99-mobile-375.png` });
  await mob.close();
} catch (e) {
  fail("fatal", String(e));
} finally {
  await browser.close();
  fs.writeFileSync("/tmp/e2e-results.json", JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} steg PASS`);
  process.exit(failed ? 1 : 0);
}
