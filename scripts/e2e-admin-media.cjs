/** Retest of the media UI flow with proper waits: upload via the panel's
 *  file input (waiting for the /api/upload response), verify it appears,
 *  then delete this run's test files via the panel. */
const { chromium } = require("playwright");
const fs = require("node:fs");
const BASE = process.env.BASE_URL;
const F = JSON.parse(fs.readFileSync("/tmp/admin-fixtures.json", "utf8"));
const RESULTS = "/tmp/e2e-admin-results.json";
const results = JSON.parse(fs.readFileSync(RESULTS, "utf8")).filter(r => !["media-upload-ui","media-delete-ui"].includes(r.n));
const ok = (n, d = "") => { results.push({ n, ok: true, d }); console.log(`PASS ${n}${d ? " — " + d : ""}`); };
const fail = (n, d) => { results.push({ n, ok: false, d }); console.log(`FAIL ${n} — ${d}`); };

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.on("dialog", (d) => d.accept());
  try {
    const { csrfToken } = await (await context.request.get(`${BASE}/api/auth/csrf`)).json();
    await context.request.post(`${BASE}/api/auth/callback/credentials`, { form: { csrfToken, email: F.email, password: F.password }, maxRedirects: 0 });

    const fname = `e2e-admin-ui.png`;
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    await page.goto(`${BASE}/admin/sites/${F.e2eSiteId}/media`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    const respP = page.waitForResponse((r) => r.url().includes("/api/upload"), { timeout: 30000 });
    await page.locator("input[type=file]").setInputFiles({ name: fname, mimeType: "image/png", buffer: png });
    const resp = await respP;
    await page.waitForTimeout(2500);
    await page.reload({ waitUntil: "domcontentloaded" });
    let body = await page.textContent("body");
    if (resp.status() === 200 && body.includes(fname)) ok("media-upload-ui", `${fname} uppladdad via media-UI:t (upload-svar 200, syns i biblioteket)`);
    else fail("media-upload-ui", `upload-status ${resp.status()}, i bibliotek: ${body.includes(fname)}`);

    // delete this run's files via UI (scoped to their cards)
    let deleted = 0;
    for (const f of [fname, "e2e-admin-apitest.png"]) {
      const card = page.locator("div, li", { hasText: new RegExp(`^(?=.*${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`) });
      const btn = page.locator(`text=${f}`).locator("xpath=ancestor::*[.//button[contains(., 'Ta bort')]][1]").locator("button", { hasText: "Ta bort" }).first();
      if (await page.locator(`text=${f}`).count()) {
        await btn.click();
        await page.waitForTimeout(3000);
        await page.reload({ waitUntil: "domcontentloaded" });
        if (!(await page.textContent("body")).includes(f)) deleted++;
      }
    }
    if (deleted === 2) ok("media-delete-ui", "båda testfilerna borttagna via media-UI:t");
    else fail("media-delete-ui", `endast ${deleted}/2 filer borttagna`);
    await page.screenshot({ path: "/tmp/e2e-admin-shots/06-media-final.png" });
  } catch (e) {
    fail("fatal-media", String(e).slice(0, 300));
  } finally {
    await browser.close();
    fs.writeFileSync(RESULTS, JSON.stringify(results, null, 2));
  }
})();
