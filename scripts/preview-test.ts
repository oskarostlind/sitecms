/**
 * Tester för live-förhandsgranskningen (docs/LIVE-PREVIEW.md §2–3) mot en
 * riktig Postgres:
 *
 *   DATABASE_DRIVER=pg DATABASE_URL=postgres://… npm run test:preview
 *
 * Täcker: token skapas och lagras bara som sha256, giltig/utgången/fel sajt,
 * setPreviewOverrides-reglerna (ersätter, ägarskap, gränser, glidande
 * utgång), sammanslagning i content-svaret (text, richtext → html, bild + alt)
 * för båda content-routerna, verify-routerna och 401 `preview_invalid`.
 * Skapar en egen testsajt och testanvändare och tar bort dem efteråt.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "../lib/db";
import { apiKeys, blocks, pages, previewSessions, sites, users } from "../lib/db/schema";
import { apiKeyColumns, generateApiKey } from "../lib/api-keys";
import {
  applyPreviewOverrides,
  createPreviewSession,
  deletePreviewSession,
  findValidPreviewSession,
  hashPreviewToken,
  panelOriginFromHeaders,
  previewBaseUrl,
  previewUrlProblem,
  replacePreviewOverrides,
} from "../lib/preview";
import { parseSiteMessage, previewPathForPage, previewStartUrl, PREVIEW_HEADER } from "../lib/preview-protocol";
import { markdownToHtml } from "../lib/markdown";
import { GET as keyContentGET } from "../app/api/v1/site/content/route";
import { GET as slugContentGET } from "../app/api/v1/sites/[slug]/content/route";
import { GET as keyPreviewGET } from "../app/api/v1/site/preview/route";
import { GET as slugPreviewGET } from "../app/api/v1/sites/[slug]/preview/route";

const SLUG_A = "preview-test-a";
const SLUG_B = "preview-test-b";
const EMAIL = "preview-test@sitecms.local";
const EMAIL_OTHER = "preview-test-other@sitecms.local";

let passed = 0;
async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    throw err;
  }
}

type ContentBody = {
  preview?: boolean;
  pages: { slug: string; blocks: { key: string; type: string; value: string | null; alt: string | null; html: string | null }[] }[];
};

function blockOf(body: ContentBody, page: string, key: string) {
  const block = body.pages.find((p) => p.slug === page)?.blocks.find((b) => b.key === key);
  assert.ok(block, `block ${page}:${key} saknas i svaret`);
  return block;
}

async function cleanup() {
  await db.delete(sites).where(inArray(sites.slug, [SLUG_A, SLUG_B]));
  await db.delete(users).where(inArray(users.email, [EMAIL, EMAIL_OTHER]));
}

async function main() {
  await cleanup();

  // --- fixtures --------------------------------------------------------------
  const [user] = await db.insert(users).values({ email: EMAIL, name: "Preview-test", role: "customer" }).returning();
  const [other] = await db.insert(users).values({ email: EMAIL_OTHER, name: "Preview-test 2", role: "customer" }).returning();
  const [siteA] = await db.insert(sites).values({ name: "Preview A", slug: SLUG_A, domain: "preview-a.example.se" }).returning();
  const [siteB] = await db.insert(sites).values({ name: "Preview B", slug: SLUG_B }).returning();
  const [home] = await db.insert(pages).values({ siteId: siteA.id, slug: "home", title: "Startsida" }).returning();
  const [pageB] = await db.insert(pages).values({ siteId: siteB.id, slug: "home", title: "Startsida" }).returning();
  const inserted = await db
    .insert(blocks)
    .values([
      { siteId: siteA.id, pageId: home.id, key: "hero.title", type: "text", value: "Sparad rubrik", sortOrder: 0 },
      { siteId: siteA.id, pageId: home.id, key: "intro.body", type: "richtext", value: "Sparad **text**.", sortOrder: 1 },
      { siteId: siteA.id, pageId: home.id, key: "hero.image", type: "image", value: "https://cdn.example.se/a.jpg", alt: "Gammal alt", sortOrder: 2 },
      { siteId: siteA.id, pageId: home.id, key: "hero.sub", type: "text", value: "Orörd", sortOrder: 3 },
    ])
    .returning();
  const byKey = Object.fromEntries(inserted.map((b) => [b.key, b]));
  const [foreignBlock] = await db
    .insert(blocks)
    .values({ siteId: siteB.id, pageId: pageB.id, key: "hero.title", type: "text", value: "B" })
    .returning();
  const keyA = generateApiKey();
  const keyB = generateApiKey();
  await db.insert(apiKeys).values([
    { siteId: siteA.id, name: "test", ...apiKeyColumns(keyA) },
    { siteId: siteB.id, name: "test", ...apiKeyColumns(keyB) },
  ]);

  const contentRequest = (apiKey: string, token?: string, path = "/api/v1/site/content") =>
    new Request(`http://localhost${path}`, {
      headers: { "x-api-key": apiKey, ...(token !== undefined ? { [PREVIEW_HEADER]: token } : {}) },
    });
  const slugParams = (slug: string) => ({ params: Promise.resolve({ slug }) });

  console.log("Token och sessioner");
  const { token, session } = await createPreviewSession({ siteId: siteA.id, userId: user.id, panelOrigin: "http://localhost:3000" });

  await test("token har formatet scp_ + 32 byte base64url", () => {
    assert.match(token, /^scp_[A-Za-z0-9_-]{43}$/);
  });
  await test("databasen lagrar bara sha256-hex, aldrig rå token", async () => {
    const expected = createHash("sha256").update(token).digest("hex");
    assert.equal(session.tokenHash, expected);
    assert.equal(hashPreviewToken(token), expected);
    const [row] = await db.select().from(previewSessions).where(eq(previewSessions.id, session.id));
    assert.ok(!JSON.stringify(row).includes(token), "rå token finns i raden");
    assert.equal(row.panelOrigin, "http://localhost:3000");
    assert.deepEqual(row.overrides, { blocks: {} });
  });
  await test("utgång om ca 2 h", () => {
    const ms = session.expiresAt.getTime() - Date.now();
    assert.ok(ms > 119 * 60_000 && ms <= 120 * 60_000 + 1000, `oväntad utgång: ${ms} ms`);
  });
  await test("två sessioner får olika token", async () => {
    const second = await createPreviewSession({ siteId: siteA.id, userId: user.id, panelOrigin: "http://localhost:3000" });
    assert.notEqual(second.token, token);
    await deletePreviewSession({ siteId: siteA.id, userId: user.id, token: second.token });
  });
  await test("giltig token hittas för rätt sajt", async () => {
    assert.ok(await findValidPreviewSession(siteA.id, token));
    assert.ok(await findValidPreviewSession(siteA.id, token, { userId: user.id }));
  });
  await test("fel sajt, fel användare, okänd eller trasig token → null", async () => {
    assert.equal(await findValidPreviewSession(siteB.id, token), null);
    assert.equal(await findValidPreviewSession(siteA.id, token, { userId: other.id }), null);
    assert.equal(await findValidPreviewSession(siteA.id, `${token}x`), null);
    assert.equal(await findValidPreviewSession(siteA.id, "scms_inte-en-preview-token"), null);
    assert.equal(await findValidPreviewSession(siteA.id, ""), null);
    assert.equal(await findValidPreviewSession(siteA.id, `scp_${"a".repeat(300)}`), null);
  });
  await test("utgången session → null, och rensas när en ny startas", async () => {
    const old = await createPreviewSession({ siteId: siteA.id, userId: user.id, panelOrigin: "http://localhost:3000" });
    await db.update(previewSessions).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(previewSessions.id, old.session.id));
    assert.equal(await findValidPreviewSession(siteA.id, old.token), null);
    const fresh = await createPreviewSession({ siteId: siteA.id, userId: user.id, panelOrigin: "http://localhost:3000" });
    const rows = await db.select({ id: previewSessions.id }).from(previewSessions).where(eq(previewSessions.id, old.session.id));
    assert.equal(rows.length, 0, "utgången session rensades inte");
    await deletePreviewSession({ siteId: siteA.id, userId: user.id, token: fresh.token });
  });

  console.log("setPreviewOverrides");
  await test("ersätter overrides och förlänger sessionen", async () => {
    await db.update(previewSessions).set({ expiresAt: new Date(Date.now() + 60_000) }).where(eq(previewSessions.id, session.id));
    const result = await replacePreviewOverrides({
      siteId: siteA.id,
      userId: user.id,
      token,
      updates: [
        { blockId: byKey["hero.title"].id, value: "Osparad rubrik" },
        { blockId: byKey["intro.body"].id, value: "Ny *kursiv* och **fet**." },
        { blockId: byKey["hero.image"].id, value: "https://cdn.example.se/b.jpg", alt: "Ny alt" },
      ],
    });
    assert.ok(result.ok, JSON.stringify(result));
    assert.ok(result.expiresAt.getTime() - Date.now() > 119 * 60_000);
    const [row] = await db.select().from(previewSessions).where(eq(previewSessions.id, session.id));
    assert.deepEqual(row.overrides.blocks[byKey["hero.title"].id], { value: "Osparad rubrik", alt: null });
    assert.deepEqual(row.overrides.blocks[byKey["hero.image"].id], { value: "https://cdn.example.se/b.jpg", alt: "Ny alt" });
    assert.equal(Object.keys(row.overrides.blocks).length, 3);
  });
  await test("block från en annan sajt avvisas (och inget skrivs)", async () => {
    const result = await replacePreviewOverrides({
      siteId: siteA.id,
      userId: user.id,
      token,
      updates: [{ blockId: foreignBlock.id, value: "x" }],
    });
    assert.equal(result.ok, false);
    const [row] = await db.select().from(previewSessions).where(eq(previewSessions.id, session.id));
    assert.equal(Object.keys(row.overrides.blocks).length, 3);
  });
  await test("annan användares session → expired", async () => {
    const result = await replacePreviewOverrides({ siteId: siteA.id, userId: other.id, token, updates: [] });
    assert.ok(!result.ok && result.code === "expired");
  });
  await test("fel sajt för token → expired", async () => {
    const result = await replacePreviewOverrides({ siteId: siteB.id, userId: user.id, token, updates: [] });
    assert.ok(!result.ok && result.code === "expired");
  });
  await test("max 200 block och 200 kB, ogiltiga fält avvisas", async () => {
    const many = Array.from({ length: 201 }, () => ({ blockId: byKey["hero.title"].id, value: "x" }));
    const tooMany = await replacePreviewOverrides({ siteId: siteA.id, userId: user.id, token, updates: many });
    assert.ok(!tooMany.ok && tooMany.code === "invalid");
    const big = await replacePreviewOverrides({
      siteId: siteA.id,
      userId: user.id,
      token,
      updates: [{ blockId: byKey["hero.title"].id, value: "x".repeat(201 * 1024) }],
    });
    assert.ok(!big.ok && big.code === "invalid");
    for (const bad of [null, "x", [{ blockId: "inte-uuid", value: "x" }], [{ blockId: byKey["hero.title"].id, value: 5 }]]) {
      const result = await replacePreviewOverrides({ siteId: siteA.id, userId: user.id, token, updates: bad });
      assert.ok(!result.ok && result.code === "invalid", `borde avvisa ${JSON.stringify(bad)}`);
    }
  });

  console.log("Sammanslagning (ren funktion)");
  await test("value ersätts, alt bara när override har alt", () => {
    const rows = [
      { id: "a", type: "image", value: "1", alt: "gammal" },
      { id: "b", type: "image", value: "2", alt: "gammal" },
      { id: "c", type: "text", value: "3", alt: null },
    ];
    const merged = applyPreviewOverrides(rows, {
      blocks: { a: { value: "1b", alt: "ny" }, b: { value: "2b", alt: null } },
    });
    assert.deepEqual(merged, [
      { id: "a", type: "image", value: "1b", alt: "ny" },
      { id: "b", type: "image", value: "2b", alt: "gammal" },
      { id: "c", type: "text", value: "3", alt: null },
    ]);
    assert.equal(applyPreviewOverrides(rows, { blocks: {} }), rows);
  });

  console.log("GET content med x-sitecms-preview");
  for (const [label, call] of [
    ["/api/v1/site/content", (t?: string) => keyContentGET(contentRequest(keyA, t))],
    [
      "/api/v1/sites/[slug]/content",
      (t?: string) => slugContentGET(contentRequest(keyA, t, `/api/v1/sites/${SLUG_A}/content`), slugParams(SLUG_A)),
    ],
  ] as const) {
    await test(`${label}: utan header — exakt som förut`, async () => {
      const res = await call();
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("cache-control"), "private, no-store");
      const body = (await res.json()) as ContentBody;
      assert.equal("preview" in body, false);
      assert.equal(blockOf(body, "home", "hero.title").value, "Sparad rubrik");
      assert.equal(blockOf(body, "home", "hero.image").alt, "Gammal alt");
    });
    await test(`${label}: tom header räknas som saknad`, async () => {
      const res = await call("  ");
      assert.equal(res.status, 200);
      assert.equal("preview" in ((await res.json()) as ContentBody), false);
    });
    await test(`${label}: giltig token — osparade värden, html omräknad, preview: true`, async () => {
      const res = await call(token);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("cache-control"), "private, no-store");
      const body = (await res.json()) as ContentBody;
      assert.equal(body.preview, true);
      const title = blockOf(body, "home", "hero.title");
      assert.equal(title.value, "Osparad rubrik");
      assert.equal(title.html, null);
      const rich = blockOf(body, "home", "intro.body");
      assert.equal(rich.value, "Ny *kursiv* och **fet**.");
      assert.equal(rich.html, markdownToHtml("Ny *kursiv* och **fet**."));
      assert.match(rich.html ?? "", /<em>kursiv<\/em>.*<strong>fet<\/strong>/);
      const image = blockOf(body, "home", "hero.image");
      assert.equal(image.value, "https://cdn.example.se/b.jpg");
      assert.equal(image.alt, "Ny alt");
      assert.equal(blockOf(body, "home", "hero.sub").value, "Orörd");
    });
    await test(`${label}: fel token → 401 preview_invalid`, async () => {
      const res = await call(`${token.slice(0, -2)}zz`);
      assert.equal(res.status, 401);
      assert.equal(res.headers.get("cache-control"), "private, no-store");
      const body = (await res.json()) as { error: string; code: string };
      assert.equal(body.code, "preview_invalid");
      assert.equal(body.error, "Förhandsgranskningen har gått ut. Öppna den igen i sitecms.");
    });
  }
  await test("token för sajt A med sajt B:s nyckel → 401 preview_invalid", async () => {
    const res = await keyContentGET(contentRequest(keyB, token));
    assert.equal(res.status, 401);
    assert.equal(((await res.json()) as { code: string }).code, "preview_invalid");
  });
  await test("fel API-nyckel → 401 som förut (utan preview-kod)", async () => {
    const res = await keyContentGET(contentRequest("scms_fel", token));
    assert.equal(res.status, 401);
    assert.equal(((await res.json()) as { code?: string }).code, undefined);
  });

  console.log("GET preview (verifiera token)");
  await test("/api/v1/site/preview: 200 med expiresAt och panelOrigin", async () => {
    const res = await keyPreviewGET(contentRequest(keyA, token, "/api/v1/site/preview"));
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("cache-control"), "private, no-store");
    const body = (await res.json()) as { ok: boolean; expiresAt: string; panelOrigin: string };
    assert.equal(body.ok, true);
    assert.equal(body.panelOrigin, "http://localhost:3000");
    assert.ok(!Number.isNaN(Date.parse(body.expiresAt)));
  });
  await test("/api/v1/sites/[slug]/preview: 200, fel sajt → 401 preview_invalid", async () => {
    const ok = await slugPreviewGET(contentRequest(keyA, token, `/api/v1/sites/${SLUG_A}/preview`), slugParams(SLUG_A));
    assert.equal(ok.status, 200);
    const wrong = await slugPreviewGET(contentRequest(keyB, token, `/api/v1/sites/${SLUG_B}/preview`), slugParams(SLUG_B));
    assert.equal(wrong.status, 401);
    assert.equal(((await wrong.json()) as { code: string }).code, "preview_invalid");
  });
  await test("saknad header → 401 preview_invalid, fel nyckel → 401", async () => {
    const missing = await keyPreviewGET(contentRequest(keyA, undefined, "/api/v1/site/preview"));
    assert.equal(missing.status, 401);
    assert.equal(((await missing.json()) as { code: string }).code, "preview_invalid");
    const badKey = await keyPreviewGET(contentRequest("scms_fel", token, "/api/v1/site/preview"));
    assert.equal(badKey.status, 401);
  });
  await test("utgången token → 401 preview_invalid på verify och content", async () => {
    await db.update(previewSessions).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(previewSessions.id, session.id));
    const verify = await keyPreviewGET(contentRequest(keyA, token, "/api/v1/site/preview"));
    assert.equal(verify.status, 401);
    assert.equal(((await verify.json()) as { code: string }).code, "preview_invalid");
    const content = await keyContentGET(contentRequest(keyA, token));
    assert.equal(content.status, 401);
    const update = await replacePreviewOverrides({ siteId: siteA.id, userId: user.id, token, updates: [] });
    assert.ok(!update.ok && update.code === "expired");
  });
  await test("endPreviewSession raderar sessionen", async () => {
    const live = await createPreviewSession({ siteId: siteA.id, userId: user.id, panelOrigin: "https://sitecms.se" });
    await deletePreviewSession({ siteId: siteA.id, userId: other.id, token: live.token });
    assert.ok(await findValidPreviewSession(siteA.id, live.token), "annan användare fick radera");
    await deletePreviewSession({ siteId: siteA.id, userId: user.id, token: live.token });
    assert.equal(await findValidPreviewSession(siteA.id, live.token), null);
  });

  console.log("Adresser och protokoll");
  await test("previewBaseUrl: preview_url → domän → revalidate-origin → null", () => {
    assert.equal(previewBaseUrl({ previewUrl: "https://gren.vercel.app/", domain: "kund.se" }), "https://gren.vercel.app");
    assert.equal(previewBaseUrl({ previewUrl: null, domain: "https://www.Kund.se/" }), "https://www.kund.se");
    assert.equal(previewBaseUrl({ domain: null, revalidateUrl: "https://kund.vercel.app/api/sitecms/revalidate" }), "https://kund.vercel.app");
    assert.equal(previewBaseUrl({ domain: "", revalidateUrl: "https://api.vercel.com/v1/integrations/deploy/abc" }), null);
    assert.equal(previewBaseUrl({}), null);
  });
  await test("previewUrlProblem: https:// eller http://localhost", () => {
    for (const ok of ["https://kund.se", "https://gren-kund.vercel.app/", "http://localhost:3001", "http://localhost"]) {
      assert.equal(previewUrlProblem(ok), null, ok);
    }
    for (const bad of ["kund.se", "http://kund.se", "ftp://kund.se", "https://user:pw@kund.se", "https://kund.se/?a=1", "javascript:alert(1)", ""]) {
      assert.equal(previewUrlProblem(bad), "preview-url-invalid", bad);
    }
  });
  await test("panelOriginFromHeaders", () => {
    const h = (init: Record<string, string>) => new Headers(init);
    assert.equal(panelOriginFromHeaders(h({ host: "localhost:3000" })), "http://localhost:3000");
    assert.equal(panelOriginFromHeaders(h({ host: "sitecms.se" })), "https://sitecms.se");
    assert.equal(
      panelOriginFromHeaders(h({ host: "intern", "x-forwarded-host": "sitecms.se, proxy", "x-forwarded-proto": "https" })),
      "https://sitecms.se",
    );
    assert.equal(panelOriginFromHeaders(h({ host: "evil.se/x" })), null);
    assert.equal(panelOriginFromHeaders(h({})), null);
  });
  await test("iframe-adress, startsökväg och meddelandetolkning", () => {
    assert.equal(previewPathForPage("home"), "/");
    assert.equal(previewPathForPage("om-oss"), "/om-oss");
    const url = new URL(previewStartUrl("https://kund.se/", "scp_abc", "//evil.se"));
    assert.equal(url.pathname, "/api/sitecms/preview");
    assert.equal(url.searchParams.get("token"), "scp_abc");
    assert.equal(url.searchParams.get("path"), "/");
    assert.deepEqual(parseSiteMessage({ source: "sitecms-preview", v: 1, type: "focus", page: "home", key: "hero.title" }), {
      type: "focus",
      page: "home",
      key: "hero.title",
    });
    assert.equal(parseSiteMessage({ source: "sitecms", v: 1, type: "focus", page: "home", key: "x" }), null);
    assert.equal(parseSiteMessage({ source: "sitecms-preview", v: 2, type: "ready" }), null);
    assert.equal(parseSiteMessage({ source: "sitecms-preview", v: 1, type: "focus", page: "Home", key: "x" }), null);
    const ready = parseSiteMessage({
      source: "sitecms-preview",
      v: 1,
      type: "ready",
      path: "/om",
      title: "Om",
      fields: [{ page: "om", key: "a.b" }, { page: "BAD", key: "x" }],
    });
    assert.deepEqual(ready, { type: "ready", path: "/om", title: "Om", fields: [{ page: "om", key: "a.b" }] });
  });

  await cleanup();
  console.log(`\n${passed} tester gick igenom.`);
}

main()
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error(err);
    try {
      await cleanup();
    } catch {
      // ignoreras
    }
    process.exit(1);
  });
