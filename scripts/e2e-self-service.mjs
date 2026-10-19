/**
 * E2E i produktion för självbetjäningsflödet. Körs i steg (STAGE=…) eftersom
 * e-postlänkarna hämtas ur en riktig inkorg mellan stegen:
 *
 *   STAGE=signup   E2E_EMAIL=… E2E_PASSWORD=…          → skapar konto, väntar på verifieringsmejl
 *   STAGE=site     VERIFY_URL=…                        → verifierar, loggar in, skapar sajt, API/schema/innehåll
 *   STAGE=edit     INVITEE_EMAIL=…                     → redigering i panelen, nytt fält, integration, bjuder in redaktör
 *   STAGE=invite   INVITE_URL=… INVITEE_PASSWORD=…     → accepterar inbjudan i ny webbläsarkontext, redaktörsrättigheter
 *   STAGE=forgot                                       → begär återställningsmejl
 *   STAGE=reset    RESET_URL=… NEW_PASSWORD=…          → sätter nytt lösenord, loggar in
 *   STAGE=cleanup                                      → tar bort testsajt och båda testkontona
 *
 * Tillstånd mellan stegen sparas i STATE_FILE (JSON). Inga lösenord skrivs
 * i loggen.
 */
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = (process.env.BASE_URL ?? "https://sitecms-zeta.vercel.app").replace(/\/$/, "");
const STAGE = process.env.STAGE ?? "signup";
const STATE_FILE = process.env.STATE_FILE ?? "/tmp/e2e-self-service-state.json";
const SHOTS = process.env.SHOTS_DIR ?? "/tmp/e2e-self-service-shots";
fs.mkdirSync(SHOTS, { recursive: true });

const state = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) : {};
const save = () => fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

const results = [];
let shotNo = 0;
const pass = (name, detail = "") => {
  results.push({ name, ok: true, detail });
  console.log(`PASS ${name}${detail ? " — " + detail : ""}`);
};
const fail = (name, detail = "") => {
  results.push({ name, ok: false, detail });
  console.log(`FAIL ${name} — ${detail}`);
};
async function shot(page, name) {
  shotNo += 1;
  await page.screenshot({ path: `${SHOTS}/${STAGE}-${String(shotNo).padStart(2, "0")}-${name}.png` });
}
function must(cond, name, detail) {
  if (cond) pass(name, detail);
  else fail(name, detail);
  return cond;
}
async function expectUrl(page, re, name) {
  await page.waitForURL(re, { timeout: 25000 }).catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  const url = page.url();
  return must(re.test(url), name, url.replace(BASE, ""));
}
/** Klickar och väntar tills server-actionens redirect har landat (URL ändrad) eller 25 s. */
async function submit(page, selector) {
  const before = page.url();
  await page.click(selector);
  await page.waitForURL((u) => u.toString() !== before, { timeout: 25000 }).catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
}
async function loginViaForm(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await submit(page, 'button[type="submit"]:has-text("Logga in")');
}
async function api(context, method, path, { key, body } = {}) {
  const res = await context.request.fetch(`${BASE}${path}`, {
    method,
    headers: { ...(key ? { "x-api-key": key } : {}), "Content-Type": "application/json" },
    data: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status(), json };
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

try {
  if (STAGE === "signup") {
    const email = process.env.E2E_EMAIL;
    const password = process.env.E2E_PASSWORD;
    state.devEmail = email;
    for (const path of ["/", "/docs", "/signup", "/login", "/forgot"]) {
      const res = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
      must(res?.status() === 200, `GET ${path}`, `status ${res?.status()}`);
    }
    await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
    await shot(page, "signup");
    await page.fill('input[name="name"]', "E2E Utvecklare");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await submit(page, 'button:has-text("Skapa konto")');
    await expectUrl(page, /\/signup\?sent=1/, "signup → kolla din mejl");
    await shot(page, "signup-sent");
    // Overifierat konto får inte logga in
    await loginViaForm(page, email, password);
    await expectUrl(page, /\/login\?error=unverified/, "login nekas före verifiering");
    save();
  }

  if (STAGE === "site") {
    const verifyUrl = process.env.VERIFY_URL;
    const password = process.env.E2E_PASSWORD;
    const email = state.devEmail;
    await page.goto(verifyUrl, { waitUntil: "networkidle" });
    await shot(page, "verify");
    await submit(page, 'button:has-text("Bekräfta e-postadressen")');
    await expectUrl(page, /\/login\?verified=1/, "verify → login?verified=1");
    await loginViaForm(page, email, password);
    await expectUrl(page, /\/admin/, "login efter verifiering");
    await shot(page, "admin-empty");

    // Skapa sajt
    const siteName = `E2E Testsajt ${Date.now().toString(36)}`;
    await page.goto(`${BASE}/admin/sites/new`, { waitUntil: "networkidle" });
    await page.fill('input[name="name"]', siteName);
    await submit(page, 'button[type="submit"]');
    const url = new URL(page.url());
    const siteId = url.searchParams.get("siteId");
    must(!/[?&](key|newKey|newSecret)=/.test(page.url()), "API-nyckeln ligger inte i URL:en", page.url().replace(BASE, ""));
    await page.click('button:has-text("Visa")');
    const apiKey = ((await page.locator("code").first().textContent()) ?? "").trim();
    must(Boolean(siteId && apiKey.startsWith("scms_")), "sajt skapad med API-nyckel", `siteId=${siteId}`);
    state.siteId = siteId;
    state.siteName = siteName;
    state.apiKey = apiKey;
    await shot(page, "site-created");

    // Slug från integrationssidan
    await page.goto(`${BASE}/admin/sites/${siteId}/integration`, { waitUntil: "networkidle" });
    await shot(page, "integration");
    const body = await page.textContent("body");
    const slugMatch = body.match(/CMS_SITE=([a-z0-9-]+)/);
    state.slug = slugMatch?.[1];
    must(Boolean(state.slug), "integrationssidan visar CMS_SITE", state.slug);
    must(body.includes("Ingen sync ännu"), "integration: ingen schema-sync ännu");

    // Health + schema + content via API
    const health = await api(context, "GET", `/api/v1/sites/${state.slug}/health`, { key: apiKey });
    must(health.status === 200 && health.json?.ok === true, "health med nyckel", JSON.stringify(health.json));
    const noKey = await api(context, "GET", `/api/v1/sites/${state.slug}/health`);
    must(noKey.status === 401, "health utan nyckel → 401", `status ${noKey.status}`);

    const schema = {
      version: 1,
      pages: [
        {
          slug: "home",
          title: "Startsida",
          description: "Det besökaren ser först.",
          blocks: [
            { key: "hero.title", type: "text", label: "Rubrik", help: "Max 60 tecken", default: "Välkommen till E2E" },
            { key: "hero.subtitle", type: "text", label: "Underrubrik", default: "Vi testar självbetjäning" },
            { key: "intro.body", type: "richtext", label: "Ingress", default: "Vi bygger **hållbart**." },
          ],
        },
        { slug: "kontakt", title: "Kontakt", blocks: [{ key: "kontakt.phone", label: "Telefon", default: "070-123 45 67" }] },
      ],
    };
    const sync = await api(context, "POST", `/api/v1/sites/${state.slug}/schema`, { key: apiKey, body: schema });
    must(
      sync.status === 200 && sync.json?.created?.blocks === 4 && sync.json?.created?.pages === 1,
      "schema POST skapar struktur",
      JSON.stringify(sync.json),
    );
    const sync2 = await api(context, "POST", `/api/v1/sites/${state.slug}/schema`, { key: apiKey, body: schema });
    must(sync2.status === 200 && sync2.json?.created?.blocks === 0, "schema POST idempotent", JSON.stringify(sync2.json));
    const bad = await api(context, "POST", `/api/v1/sites/${state.slug}/schema`, {
      key: apiKey,
      body: { pages: [{ slug: "Home", title: "x", blocks: [{ key: "a", type: "video" }] }] },
    });
    must(bad.status === 400 && Array.isArray(bad.json?.issues) && bad.json.issues.length >= 2, "schema POST validerar", JSON.stringify(bad.json?.issues));
    const get = await api(context, "GET", `/api/v1/sites/${state.slug}/schema`, { key: apiKey });
    const homeGet = get.json?.pages?.find((p) => p.slug === "home");
    must(get.status === 200 && homeGet?.blocks?.length === 3 && homeGet.blocks[0].hasValue === true, "schema GET", JSON.stringify(homeGet?.blocks?.map((b) => b.key)));

    const content = await api(context, "GET", `/api/v1/sites/${state.slug}/content`, { key: apiKey });
    const home = content.json?.pages?.find((p) => p.slug === "home");
    const title = home?.blocks?.find((b) => b.key === "hero.title");
    must(title?.value === "Välkommen till E2E" && title?.label === "Rubrik", "content-API levererar default + label", JSON.stringify(title));
    const intro = home?.blocks?.find((b) => b.key === "intro.body");
    must(typeof intro?.html === "string" && intro.html.includes("<strong>"), "content-API renderar richtext-html", intro?.html);

    // Integration visar senaste sync
    await page.goto(`${BASE}/admin/sites/${siteId}/integration`, { waitUntil: "networkidle" });
    must((await page.textContent("body")).includes("Senaste schema-sync"), "integration visar senaste schema-sync");

    save();
  }

  if (STAGE === "invite-only") {
    await loginViaForm(page, state.devEmail, process.env.E2E_PASSWORD);
    await expectUrl(page, /\/admin/, "login (dev)");
    const invitee = process.env.INVITEE_EMAIL;
    state.inviteeEmail = invitee;
    await page.goto(`${BASE}/admin/sites/${state.siteId}/medlemmar`, { waitUntil: "networkidle" });
    await shot(page, "members");
    await page.fill("#invite-email", invitee);
    await page.selectOption("#invite-role", "editor");
    await submit(page, 'button[type="submit"]:has-text("Skicka inbjudan")');
    must(page.url().includes("invited=") && !page.url().includes("mailFailed"), "inbjudan skickad", page.url().replace(BASE, ""));
    await page.goto(`${BASE}/admin/sites/${state.siteId}/medlemmar`, { waitUntil: "networkidle" });
    must((await page.textContent("body")).includes(invitee), "väntande inbjudan listas");
    await shot(page, "members-invited");
    save();
  }

  if (STAGE === "edit") {
    const password = process.env.E2E_PASSWORD;
    const { siteId } = state;
    await loginViaForm(page, state.devEmail, password);
    await expectUrl(page, /\/admin/, "login (dev)");
    if (!state.apiKey) {
      // Nyckeln visas bara en gång — skapa en ny via integrationssidan.
      await page.goto(`${BASE}/admin/sites/${siteId}/integration`, { waitUntil: "networkidle" });
      await page.fill("#keyName", "E2E-nyckel");
      await submit(page, 'button:has-text("Skapa nyckel")');
      must(!page.url().includes("newKey="), "ny API-nyckel ligger inte i URL:en");
      state.apiKey = ((await page.textContent("body")) ?? "").match(/CMS_API_KEY=(scms_[A-Za-z0-9_-]+)/)?.[1] ?? null;
      must(Boolean(state.apiKey), "ny API-nyckel via integrationssidan");
      save();
    }
    const apiKey = state.apiKey;

    // Redigera ett fält i panelen → syns i API:t
    await page.goto(`${BASE}/admin/sites/${siteId}/pages`, { waitUntil: "networkidle" });
    await shot(page, "pages");
    const pageBody = await page.textContent("body");
    must(pageBody.includes("Startsida") && pageBody.includes("Kontakt"), "sidlistan visar synkade sidor");
    await page.click('a:has-text("Startsida")');
    await page.waitForURL(/\/pages\/[0-9a-f-]{36}/, { timeout: 20000 });
    await page.waitForLoadState("networkidle");
    await shot(page, "page-editor");
    const input = page.getByRole("textbox", { name: /^Rubrik\b/ }).first();
    await input.fill("Rubrik ändrad av E2E");
    await page.click('button:has-text("Spara")');
    await page.waitForTimeout(2500);
    const content2 = await api(context, "GET", `/api/v1/sites/${state.slug}/content`, { key: apiKey });
    const title2 = content2.json?.pages?.find((p) => p.slug === "home")?.blocks?.find((b) => b.key === "hero.title");
    must(title2?.value === "Rubrik ändrad av E2E", "panelredigering syns i content-API", title2?.value);
    await shot(page, "page-edited");

    // Lägg till fält via panelen (owner)
    await page.fill("#new-field-key", "hero.cta");
    await page.fill("#new-field-label", "Knapptext");
    await submit(page, 'button:has-text("Lägg till fält")');
    must(page.url().includes("created=1"), "owner kan lägga till fält", page.url().replace(BASE, ""));

    // Integration: revalidate-URL + hemlighet + anslutningstest
    await page.goto(`${BASE}/admin/sites/${siteId}/integration`, { waitUntil: "networkidle" });
    await page.fill('input[name="revalidateUrl"]', "https://postman-echo.com/post");
    await submit(page, 'button:has-text("Spara revalidate-URL")');
    page.once("dialog", (d) => d.accept());
    await submit(page, 'button:has-text("enerera hemlighet")');
    must(!page.url().includes("newSecret="), "hemligheten ligger inte i URL:en");
    must(/CMS_REVALIDATE_SECRET=[0-9a-f]{48}/.test((await page.textContent("body")) ?? ""), "revalidate-hemlighet genererad");
    await submit(page, 'button:has-text("Testa anslutningen")');
    await shot(page, "connection-check");
    must(page.url().includes("check=ok"), "anslutningstest ok", page.url().replace(BASE, "").slice(0, 120));

    // Bjud in redaktör
    const invitee = process.env.INVITEE_EMAIL;
    state.inviteeEmail = invitee;
    await page.goto(`${BASE}/admin/sites/${siteId}/medlemmar`, { waitUntil: "networkidle" });
    await shot(page, "members");
    await page.fill("#invite-email", invitee);
    await page.selectOption("#invite-role", "editor");
    await submit(page, 'button[type="submit"]:has-text("Skicka inbjudan")');
    must(page.url().includes("invited=") && !page.url().includes("mailFailed"), "inbjudan skickad", page.url().replace(BASE, ""));
    await page.goto(`${BASE}/admin/sites/${siteId}/medlemmar`, { waitUntil: "networkidle" });
    must((await page.textContent("body")).includes(invitee), "väntande inbjudan listas");
    await shot(page, "members-invited");
    save();
  }

  if (STAGE === "invite") {
    const inviteUrl = process.env.INVITE_URL;
    const password = process.env.INVITEE_PASSWORD;
    await page.goto(inviteUrl, { waitUntil: "networkidle" });
    await shot(page, "invite");
    const body = await page.textContent("body");
    must(body.includes(state.siteName), "inbjudan visar sajtens namn");
    await page.fill('input[name="name"]', "E2E Redaktör");
    await page.fill('input[name="password"]', password);
    await submit(page, 'button[type="submit"]:has-text("Acceptera")');
    await expectUrl(page, new RegExp(`/admin/sites/${state.siteId}`), "accept → inloggad på sajten");
    await shot(page, "editor-dashboard");
    const nav = await page.textContent("body");
    must(!nav.includes("Integration") && !nav.includes("Medlemmar"), "redaktör ser inte ägarmenyn");
    await page.goto(`${BASE}/admin/sites/${state.siteId}/integration`, { waitUntil: "networkidle" });
    must(page.url().includes("error=owner-only"), "redaktör nekas integrationssidan", page.url().replace(BASE, ""));
    await page.goto(`${BASE}/admin/sites/${state.siteId}/pages`, { waitUntil: "networkidle" });
    must(!(await page.textContent("body")).includes("Skapa sida"), "redaktör ser inte Ny sida");
    await page.click('a:has-text("Startsida")');
    await page.waitForURL(/\/pages\/[0-9a-f-]{36}/, { timeout: 20000 });
    await page.waitForLoadState("networkidle");
    const input = page.getByRole("textbox", { name: /^Underrubrik\b/ }).first();
    await input.fill("Redaktören var här");
    await page.click('button:has-text("Spara")');
    await page.waitForTimeout(2500);
    const content = await api(context, "GET", `/api/v1/sites/${state.slug}/content`, { key: state.apiKey });
    const sub = content.json?.pages?.find((p) => p.slug === "home")?.blocks?.find((b) => b.key === "hero.subtitle");
    must(sub?.value === "Redaktören var här", "redaktör kan redigera innehåll", sub?.value);
    save();
  }

  if (STAGE === "forgot") {
    await page.goto(`${BASE}/forgot`, { waitUntil: "networkidle" });
    await page.fill('input[name="email"]', state.devEmail);
    await submit(page, 'button[type="submit"]');
    await expectUrl(page, /\/forgot\?sent=1/, "glömt lösenord → mejl skickat");
  }

  if (STAGE === "reset") {
    const resetUrl = process.env.RESET_URL;
    const newPassword = process.env.NEW_PASSWORD;
    await page.goto(resetUrl, { waitUntil: "networkidle" });
    await shot(page, "reset");
    await page.fill('input[name="password"]', newPassword);
    await page.fill('input[name="confirmPassword"]', newPassword);
    await submit(page, 'button[type="submit"]');
    await expectUrl(page, /\/admin/, "reset → inloggad");
    await page.goto(`${BASE}/logout`, { waitUntil: "networkidle" }).catch(() => {});
    await context.clearCookies();
    await loginViaForm(page, state.devEmail, newPassword);
    await expectUrl(page, /\/admin/, "login med nytt lösenord");
    await context.clearCookies();
    await loginViaForm(page, state.devEmail, process.env.E2E_PASSWORD);
    await expectUrl(page, /\/login\?error=invalid/, "gamla lösenordet nekas");
  }

  if (STAGE === "cleanup") {
    await loginViaForm(page, state.devEmail, process.env.E2E_PASSWORD);
    await expectUrl(page, /\/admin/, "login (dev)");
    await page.goto(`${BASE}/admin/sites/${state.siteId}/installningar`, { waitUntil: "networkidle" });
    await page.fill("#confirmName", state.siteName);
    page.once("dialog", (d) => d.accept());
    await submit(page, 'button:has-text("Ta bort sajten")');
    must(page.url().includes("removedSite="), "testsajten borttagen", page.url().replace(BASE, ""));
    const gone = await api(context, "GET", `/api/v1/sites/${state.slug}/health`, { key: state.apiKey });
    must(gone.status === 404, "sajten finns inte i API:t längre", `status ${gone.status}`);
    await page.goto(`${BASE}/admin/konto`, { waitUntil: "networkidle" });
    await page.fill("#confirmEmail", state.devEmail);
    page.once("dialog", (d) => d.accept());
    await submit(page, 'button:has-text("Avsluta kontot")');
    must(page.url().includes("closed=1"), "dev-kontot avslutat", page.url().replace(BASE, ""));
    await context.clearCookies();
    if (state.inviteeEmail && process.env.INVITEE_PASSWORD) {
      await loginViaForm(page, state.inviteeEmail, process.env.INVITEE_PASSWORD);
      await expectUrl(page, /\/admin/, "login (redaktör)");
      await page.goto(`${BASE}/admin/konto`, { waitUntil: "networkidle" });
      await page.fill("#confirmEmail", state.inviteeEmail);
      page.once("dialog", (d) => d.accept());
      await submit(page, 'button:has-text("Avsluta kontot")');
      must(page.url().includes("closed=1"), "redaktörskontot avslutat", page.url().replace(BASE, ""));
    }
  }
} catch (err) {
  fail(`${STAGE}: oväntat fel`, err instanceof Error ? err.message : String(err));
  await shot(page, "error").catch(() => {});
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${STAGE}: ${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);
