/**
 * Admin browser E2E against production with the synthetic admin account.
 * Login via auth API through the context cookie jar — no password is ever
 * typed into a login field.
 *
 * Runs in phases (PHASE=A|B|C) because the sandbox kills background
 * processes when a tool call ends (~180 s cap per call):
 *   A: admin UI flows (sites, users, media, activity, 375px)
 *   B: live edit of a JJ Bygg FAQ block + poll jjbyggboden.se
 *   C: revert the edit + poll until gone
 * Results append to /tmp/e2e-admin-results.json.
 */
const { chromium } = require("playwright");
const fs = require("node:fs");

const BASE = process.env.BASE_URL;
const PHASE = process.env.PHASE || "A";
const F = JSON.parse(fs.readFileSync("/tmp/admin-fixtures.json", "utf8"));
const LIVE = "https://www.jjbyggboden.se";
const SHOTS = "/tmp/e2e-admin-shots";
const RESULTS = "/tmp/e2e-admin-results.json";
const STATE = "/tmp/e2e-admin-state.json";
fs.mkdirSync(SHOTS, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const results = fs.existsSync(RESULTS) ? JSON.parse(fs.readFileSync(RESULTS, "utf8")) : [];
let step = results.length;

async function shot(page, name) {
  step += 1;
  await page.screenshot({ path: `${SHOTS}/${String(step).padStart(2, "0")}-${name}.png` });
}
const ok = (n, d = "") => { results.push({ n, ok: true, d }); console.log(`PASS ${n}${d ? " — " + d : ""}`); };
const fail = (n, d) => { results.push({ n, ok: false, d }); console.log(`FAIL ${n} — ${d}`); };

async function apiLogin(context, email, password) {
  const { csrfToken } = await (await context.request.get(`${BASE}/api/auth/csrf`)).json();
  const res = await context.request.post(`${BASE}/api/auth/callback/credentials`, {
    form: { csrfToken, email, password },
    maxRedirects: 0,
  });
  return res.status();
}

async function pollLive(context, predicate, timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const res = await context.request.get(LIVE, { timeout: 15000 });
      if (predicate(await res.text())) return Date.now() - t0;
    } catch {}
    await new Promise((r) => setTimeout(r, 4000));
  }
  return -1;
}

async function fieldIndexByValue(page, value) {
  return page.evaluate((val) => {
    const els = [...document.querySelectorAll("textarea, input[type=text]")];
    return els.findIndex((e) => e.value === val);
  }, value);
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.on("dialog", (d) => d.accept());

  try {
    const st = await apiLogin(context, F.email, F.password);
    if (PHASE === "A") {
      // 1) Admin sees all sites
      await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
      if (page.url().includes("/login")) throw new Error(`admin login failed (${st})`);
      const dash = await page.textContent("body");
      const missing = F.allSiteNames.filter((n) => !dash.includes(n));
      if (missing.length === 0) ok("admin-sees-all-sites", `${F.allSiteNames.length} sajter synliga på dashboarden`);
      else fail("admin-sees-all-sites", `saknas: ${missing.join(", ")}`);
      await shot(page, "dashboard");

      // 2) Create site via panel
      const siteName = "E2E Adminsajt (kan raderas)";
      await page.goto(`${BASE}/admin/sites/new`, { waitUntil: "domcontentloaded" });
      await page.locator("input[name=name]").fill(siteName);
      await page.getByRole("button", { name: "Skapa sajt" }).click();
      await page.waitForTimeout(2500);
      await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
      if ((await page.textContent("body")).includes(siteName)) ok("site-create", `"${siteName}" skapad via panelen`);
      else fail("site-create", "nya sajten syns inte på dashboarden");
      await shot(page, "site-created");

      // 3) Invite customer user via panel
      const invEmail = "e2e-invite@sitecms.local";
      await page.goto(`${BASE}/admin/anvandare`, { waitUntil: "domcontentloaded" });
      const uform = page.locator("form", { has: page.locator("input[name=email]") }).first();
      await uform.locator("input[name=name]").fill("E2E Invite (kan raderas)");
      await uform.locator("input[name=email]").fill(invEmail);
      await uform.locator(`input[name=siteIds][value="${F.e2eSiteId}"]`).check();
      await uform.getByRole("button", { name: "Skapa kundanvändare" }).click();
      await page.waitForTimeout(2500);
      let body = await page.textContent("body");
      if (body.includes("Tillfälligt lösenord") && body.includes(invEmail))
        ok("user-invite", "kundanvändare skapad via panelen, tillfälligt lösenord visas");
      else fail("user-invite", "reveal/tabellrad saknas");
      await shot(page, "user-created");

      // 4) Delete that user via panel
      const row = page.locator("tr", { hasText: invEmail });
      await row.locator("button[type=submit]").last().click();
      await page.waitForTimeout(2500);
      body = await page.textContent("body");
      if (body.includes("Användaren togs bort") && !(await page.locator("tr", { hasText: invEmail }).count()))
        ok("user-delete", "användaren borttagen via panelen");
      else fail("user-delete", "bekräftelse eller borttagning saknas");

      // 5) Media library UI: upload + delete
      const fname = `e2e-admin-${stamp}.png`;
      const png = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64"
      );
      await page.goto(`${BASE}/admin/sites/${F.e2eSiteId}/media`, { waitUntil: "domcontentloaded" });
      await page.locator("input[type=file]").setInputFiles({ name: fname, mimeType: "image/png", buffer: png });
      await page.waitForTimeout(5000);
      await page.reload({ waitUntil: "domcontentloaded" });
      if ((await page.textContent("body")).includes(fname)) ok("media-upload-ui", `${fname} uppladdad via media-UI:t`);
      else fail("media-upload-ui", "filen syns inte i biblioteket");
      await shot(page, "media-uploaded");
      await page.getByRole("button", { name: /Ta bort/ }).last().click();
      await page.waitForTimeout(3500);
      await page.reload({ waitUntil: "domcontentloaded" });
      if (!(await page.textContent("body")).includes(fname)) ok("media-delete-ui", "filen borttagen via media-UI:t");
      else fail("media-delete-ui", "filen ligger kvar");

      // 6) Global activity log
      await page.goto(`${BASE}/admin/aktivitet`, { waitUntil: "domcontentloaded" });
      body = await page.textContent("body");
      if (body.includes(F.email)) ok("activity-log", "sessionens admin-händelser loggade i globala aktivitetsvyn");
      else fail("activity-log", "inga rader från e2e-admin");
      await shot(page, "activity");

      // 7) 375px sanity on admin views
      const mob = await browser.newContext({ viewport: { width: 375, height: 800 } });
      await apiLogin(mob, F.email, F.password);
      const mp = await mob.newPage();
      let worst = 0;
      for (const path of ["/admin/anvandare", "/admin/aktivitet", `/admin/sites/${F.e2eSiteId}/media`]) {
        await mp.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
        await mp.waitForTimeout(800);
        const o = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        worst = Math.max(worst, o);
      }
      if (worst <= 1) ok("mobile-375-admin", `ingen horisontell overflow (${worst}px)`);
      else fail("mobile-375-admin", `overflow ${worst}px`);
      await mp.screenshot({ path: `${SHOTS}/99-mobile.png` });
      await mob.close();
    }

    if (PHASE === "B") {
      const MARKER = `(uppdaterad ${stamp})`;
      await page.goto(`${BASE}/admin/sites/${F.jjbyggSiteId}/pages/${F.jjbyggPageId}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2500);
      const idx = await fieldIndexByValue(page, F.faqValue);
      if (idx < 0) throw new Error("faq.a3-fältet hittades inte i editorn");
      const field = page.locator("textarea, input[type=text]").nth(idx);
      await field.fill(`${F.faqValue} ${MARKER}`);
      const section = field.locator("xpath=ancestor::section[1]");
      await section.getByRole("button", { name: /^Spara$/ }).click();
      await section.getByText("Sparat ✓").waitFor({ timeout: 15000 });
      await shot(page, "jjbygg-edited");
      fs.writeFileSync(STATE, JSON.stringify({ marker: MARKER }));
      const tSeen = await pollLive(context, (html) => html.includes(MARKER), 90000);
      if (tSeen >= 0 && tSeen <= 60000) ok("live-edit-jjbygg", `admin-ändring synlig på jjbyggboden.se efter ${Math.round(tSeen / 1000)} s`);
      else if (tSeen >= 0) fail("live-edit-jjbygg", `synlig först efter ${Math.round(tSeen / 1000)} s (>60 s)`);
      else fail("live-edit-jjbygg", "ändringen syntes aldrig live inom 90 s");
    }

    if (PHASE === "C") {
      const { marker } = JSON.parse(fs.readFileSync(STATE, "utf8"));
      await page.goto(`${BASE}/admin/sites/${F.jjbyggSiteId}/pages/${F.jjbyggPageId}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2500);
      const idx = await fieldIndexByValue(page, `${F.faqValue} ${marker}`);
      if (idx < 0) {
        // maybe already reverted (rerun) — check
        const orig = await fieldIndexByValue(page, F.faqValue);
        if (orig >= 0) ok("live-revert-jjbygg", "fältet redan återställt");
        else fail("live-revert-jjbygg", "hittar varken ändrat eller originalvärde — KONTROLLERA manuellt");
      } else {
        const f2 = page.locator("textarea, input[type=text]").nth(idx);
        await f2.fill(F.faqValue);
        const sec2 = f2.locator("xpath=ancestor::section[1]");
        await sec2.getByRole("button", { name: /^Spara$/ }).click();
        await sec2.getByText("Sparat ✓").waitFor({ timeout: 15000 });
        await shot(page, "jjbygg-reverted");
        const tGone = await pollLive(context, (html) => !html.includes(marker), 90000);
        if (tGone >= 0) ok("live-revert-jjbygg", `originaltext återställd och live efter ${Math.round(tGone / 1000)} s`);
        else fail("live-revert-jjbygg", "återställningen syntes inte live inom 90 s — KONTROLLERA jjbyggboden.se");
      }
    }
  } catch (e) {
    fail(`fatal-${PHASE}`, String(e).slice(0, 300));
  } finally {
    await browser.close();
    fs.writeFileSync(RESULTS, JSON.stringify(results, null, 2));
    const failed = results.filter((r) => !r.ok).length;
    console.log(`\n${results.length - failed}/${results.length} steg PASS totalt`);
  }
})();
