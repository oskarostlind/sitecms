// CLI-tester mot dist/cli.js och en lokal mock av sitecms (node:http).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PKG_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(PKG_DIR, "dist", "cli.js");
const GOOD_KEY = "sk_test_godkand";

const state = {
  schemaPages: [],
  revalidateUrl: null,
  /** Om satt: returneras som revalidateUrl från POST schema (oavsett siteUrl). */
  schemaRevalidateUrl: undefined,
  webhook: { configured: false, lastStatus: null, lastAt: null, lastError: null },
  requests: [],
};

let server;
let baseUrl;
const tempDirs = [];

before(async () => {
  server = createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      const body = raw ? JSON.parse(raw) : null;
      state.requests.push({ method: req.method, url: req.url, key: req.headers["x-api-key"], body });
      const send = (status, data) => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(data));
      };
      const m = req.url.match(/^\/api\/v1\/(?:site|sites\/[^/]+)\/(health|schema)$/);
      if (!m) return send(404, { error: "Hittades inte." });
      if (req.headers["x-api-key"] !== GOOD_KEY) return send(401, { error: "Ogiltig API-nyckel." });
      if (m[1] === "health") {
        return send(200, {
          ok: true,
          site: { name: "Testsajt", slug: "testsajt" },
          pages: state.schemaPages.length,
          lastSchemaSyncAt: null,
          revalidateUrl: state.revalidateUrl,
          webhook: state.webhook,
        });
      }
      if (req.method === "GET") return send(200, { version: 1, pages: state.schemaPages, lastSchemaSyncAt: null });
      return send(200, {
        ok: true,
        created: { pages: body.pages.length, blocks: 2 },
        updated: { pages: 0, blocks: 0 },
        orphans: [],
        revalidateUrl:
          state.schemaRevalidateUrl !== undefined
            ? state.schemaRevalidateUrl
            : body.siteUrl && !body.siteUrl.includes("localhost")
              ? `${body.siteUrl}/api/sitecms/revalidate`
              : null,
      });
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

function reset() {
  state.schemaPages = [];
  state.revalidateUrl = null;
  state.schemaRevalidateUrl = undefined;
  state.webhook = { configured: false, lastStatus: null, lastAt: null, lastError: null };
  state.requests = [];
}

/** Kör CLI:t asynkront (servern lever i samma process). */
function run(cwd, args, extraEnv = {}) {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [CLI, ...args], {
      cwd,
      // TZ följer med så att datumet i utkommenterade rader blir detsamma som i testet.
      env: { PATH: process.env.PATH, HOME: cwd, ...(process.env.TZ ? { TZ: process.env.TZ } : {}), CMS_API_URL: baseUrl, ...extraEnv },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => resolvePromise({ code, stdout, stderr }));
  });
}

/** Ett tillfälligt projekt. sitecms-next länkas in så att configen kan importera paketet. */
function project(files) {
  const dir = mkdtempSync(join(tmpdir(), "sitecms-cli-"));
  tempDirs.push(dir);
  for (const [name, content] of Object.entries(files)) {
    const path = join(dir, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  mkdirSync(join(dir, "node_modules"), { recursive: true });
  symlinkSync(PKG_DIR, join(dir, "node_modules", "sitecms-next"), "dir");
  return dir;
}

const read = (dir, name) => readFileSync(join(dir, name), "utf8");
const snapshot = (dir, names) => Object.fromEntries(names.map((n) => [n, existsSync(join(dir, n)) ? read(dir, n) : null]));

test("init: Next.js med src/app — skapar allt, bevarar prebuild och är idempotent", async () => {
  reset();
  const pkg = {
    name: "kund",
    private: true,
    scripts: { dev: "next dev", prebuild: "echo hej", build: "next build" },
    dependencies: { next: "15.0.0", "sitecms-next": "^0.4.0" },
  };
  const dir = project({
    "package.json": JSON.stringify(pkg, null, 4) + "\n",
    "tsconfig.json": "{}\n",
    "src/app/page.tsx": "export default function Page() { return null; }\n",
    ".gitignore": "node_modules\n",
    ".env.local": "# lokalt\nOTHER=1\n",
  });

  const first = await run(dir, ["init", GOOD_KEY]);
  assert.equal(first.code, 0, first.stderr + first.stdout);

  assert.equal(read(dir, ".env.local"), `# lokalt\nOTHER=1\nCMS_API_KEY=${GOOD_KEY}\n`);
  assert.equal(read(dir, ".gitignore"), "node_modules\n.env.local\n");
  const route = read(dir, "src/app/api/sitecms/revalidate/route.ts");
  assert.match(route, /export \{ POST \} from "sitecms-next\/revalidate";/);
  const previewRoute = read(dir, "src/app/api/sitecms/preview/route.ts");
  assert.match(previewRoute, /^export \{ GET \} from "sitecms-next\/preview";$/m);
  assert.equal(existsSync(join(dir, "app")), false);

  // Nästa steg för live-förhandsgranskning skrivs ut; layouten rörs inte.
  assert.match(first.stdout, /Live-förhandsgranskning/);
  assert.match(first.stdout, /I src\/app\/layout\.tsx, sist i <body>:/);
  assert.match(first.stdout, /<SitecmsPreview \/>/);
  assert.match(first.stdout, /editable\("home", "hero\.title"\)/);
  assert.match(first.stdout, /previewFrameHeaders\(\)/);
  assert.match(first.stdout, /ta bort X-Frame-Options/);
  assert.match(first.stdout, /Layouten och next\.config\.ts ändras inte automatiskt/);
  assert.match(first.stdout, /src\/app\/api\/sitecms\/preview\/route\.ts/);

  const config = read(dir, "sitecms.config.ts");
  assert.match(config, /import \{ defineConfig \} from "sitecms-next";/);
  assert.match(config, /slug: "home"/);

  const pkgText = read(dir, "package.json");
  assert.match(pkgText, /^ {4}"scripts": \{$/m, "4-stegs indrag bevarat");
  assert.ok(pkgText.endsWith("}\n"));
  const pkgAfter = JSON.parse(pkgText);
  assert.equal(pkgAfter.scripts.prebuild, "echo hej && sitecms-next sync");
  assert.deepEqual(Object.keys(pkgAfter.scripts), ["dev", "prebuild", "build"]);
  assert.deepEqual(pkgAfter.dependencies, pkg.dependencies);

  // Synken kördes med nyckel-routen och configens sidor.
  const posts = state.requests.filter((r) => r.method === "POST");
  assert.equal(posts.length, 1);
  assert.equal(posts[0].url, "/api/v1/site/schema");
  assert.equal(posts[0].body.pages[0].slug, "home");
  assert.equal(posts[0].body.siteUrl, undefined);
  assert.ok(state.requests.some((r) => r.url === "/api/v1/site/health"));

  assert.match(first.stdout, /Lägg CMS_API_KEY=… som miljövariabel hos ditt webbhotell \(Vercel, Netlify, Cloudflare, egen server …\) och deploya\./);
  assert.match(first.stdout, /Skapat\/uppdaterat/);

  // Andra körningen: nyckeln tas från .env.local, inget ändras.
  const files = [
    ".env.local",
    ".gitignore",
    "package.json",
    "sitecms.config.ts",
    "src/app/api/sitecms/revalidate/route.ts",
    "src/app/api/sitecms/preview/route.ts",
  ];
  const before = snapshot(dir, files);
  const second = await run(dir, ["init"]);
  assert.equal(second.code, 0, second.stderr + second.stdout);
  assert.deepEqual(snapshot(dir, files), before);
  assert.match(second.stdout, /Hoppade över/);
  assert.match(second.stdout, /fanns redan/);
  assert.equal(read(dir, ".env.local").match(/CMS_API_KEY=/g).length, 1);
});

test("init: config från befintlig struktur, app/ utan TypeScript, annan nyckel ersätts bara med --force", async () => {
  reset();
  const pagesFromSchema = [
    {
      slug: "om-oss",
      title: "Om oss",
      description: "Företaget",
      blocks: [
        { key: "intro", type: "text", label: "Ingress", help: null, hasValue: true },
        { key: "hero.bild", type: "image", label: "Bild \"stor\"", help: "Liggande", hasValue: false },
      ],
    },
  ];
  state.schemaPages = pagesFromSchema;
  const dir = project({
    "package.json": '{\n  "name": "kund2",\n  "dependencies": { "next": "14.2.0", "sitecms-next": "^0.4.0" }\n}',
    "app/page.jsx": "export default function Page() { return null; }\n",
    ".gitignore": "node_modules\n.env*\n",
    ".env.local": "export CMS_API_KEY=gammal\nFOO=bar",
  });

  // Utan --force (och utan TTY): avbryter innan något skrivs.
  const files = [".env.local", ".gitignore", "package.json", "sitecms.config.mjs", "app/api/sitecms/revalidate/route.js"];
  const before = snapshot(dir, files);
  const refused = await run(dir, ["init", GOOD_KEY]);
  assert.equal(refused.code, 1);
  assert.match(refused.stderr, /\.env\.local har redan en annan CMS_API_KEY/);
  assert.match(refused.stderr, /--force/);
  assert.match(refused.stderr, /Inget har ändrats/);
  assert.doesNotMatch(refused.stderr, /gammal/, "den gamla nyckeln skrivs inte ut i klartext");
  assert.deepEqual(snapshot(dir, files), before);
  assert.equal(state.requests.filter((r) => r.method === "POST").length, 0);

  reset();
  state.schemaPages = pagesFromSchema;
  const res = await run(dir, ["init", GOOD_KEY, "--force"]);
  assert.equal(res.code, 0, res.stderr + res.stdout);
  const date = new Date();
  const ymd = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  assert.equal(
    read(dir, ".env.local"),
    `# export CMS_API_KEY=gammal (ersatt av sitecms-next init ${ymd})\nexport CMS_API_KEY=${GOOD_KEY}\nFOO=bar`,
  );
  assert.match(res.stdout, /den gamla raden är utkommenterad/);

  // Körs igen: nyckeln är densamma, inget ändras och ingen fråga.
  const envAfter = read(dir, ".env.local");
  const again = await run(dir, ["init", GOOD_KEY]);
  assert.equal(again.code, 0, again.stderr + again.stdout);
  assert.equal(read(dir, ".env.local"), envAfter);
  assert.equal(read(dir, ".gitignore"), "node_modules\n.env*\n");
  assert.ok(existsSync(join(dir, "app/api/sitecms/revalidate/route.js")));
  assert.equal(read(dir, "app/api/sitecms/preview/route.js").includes('export { GET } from "sitecms-next/preview";'), true);
  assert.match(again.stdout, /app\/api\/sitecms\/preview\/route\.js \(fanns redan\)/);
  assert.match(again.stdout, /I app\/layout\.jsx, sist i <body>:/);

  const config = read(dir, "sitecms.config.mjs");
  assert.match(config, /slug: "om-oss"/);
  assert.match(config, /description: "Företaget"/);
  assert.match(config, /\{ key: "intro", label: "Ingress" \}/);
  assert.match(config, /\{ key: "hero.bild", type: "image", label: "Bild \\"stor\\"", help: "Liggande" \}/);

  const pkgText = read(dir, "package.json");
  assert.equal(JSON.parse(pkgText).scripts.prebuild, "sitecms-next sync");
  assert.ok(!pkgText.endsWith("\n"), "ingen avslutande radbrytning tillagd");
  // Bara scripts lades till; inline-objektet för dependencies är orört.
  assert.equal(
    pkgText,
    '{\n  "name": "kund2",\n  "dependencies": { "next": "14.2.0", "sitecms-next": "^0.4.0" },\n  "scripts": {\n    "prebuild": "sitecms-next sync"\n  }\n}',
  );

  const post = state.requests.find((r) => r.method === "POST");
  assert.deepEqual(post.body.pages.map((p) => p.slug), ["om-oss"]);
  assert.equal(post.body.pages[0].blocks[1].label, 'Bild "stor"');
});

test("init: inte Next.js → ingen route, instruktion om deploy hook", async () => {
  reset();
  const dir = project({
    "package.json": JSON.stringify({ name: "astro-sajt", dependencies: { astro: "4.0.0", "sitecms-next": "^0.4.0" } }, null, 2),
  });
  const res = await run(dir, ["init", GOOD_KEY]);
  assert.equal(res.code, 0, res.stderr + res.stdout);
  assert.equal(existsSync(join(dir, "app")), false);
  assert.equal(existsSync(join(dir, "src/app")), false);
  assert.match(res.stdout, /deploy hook/);
  assert.ok(existsSync(join(dir, "sitecms.config.mjs")));
  assert.doesNotMatch(res.stdout, /Live-förhandsgranskning/);
});

test("init: befintlig preview-route skrivs inte över; sitecms-next 0.3 räknas som för gammal", async () => {
  reset();
  const custom = 'import { createPreviewRoute } from "sitecms-next/preview";\nexport const GET = createPreviewRoute({ site: "x" });\n';
  const dir = project({
    "package.json": JSON.stringify({ name: "kund", dependencies: { next: "15.0.0", "sitecms-next": "^0.3.0" } }, null, 2),
    "tsconfig.json": "{}\n",
    "app/layout.tsx": "export default function L({ children }) { return children; }\n",
    "app/api/sitecms/preview/route.ts": custom,
    "next.config.mjs": "export default {};\n",
  });
  const res = await run(dir, ["init", GOOD_KEY, "--no-install"]);
  assert.equal(res.code, 0, res.stderr + res.stdout);
  assert.equal(read(dir, "app/api/sitecms/preview/route.ts"), custom);
  assert.match(res.stdout, /app\/api\/sitecms\/preview\/route\.ts \(fanns redan\)/);
  assert.ok(existsSync(join(dir, "app/api/sitecms/revalidate/route.ts")));
  // Versionsnumret i tipset följer paketets egen version (package.json).
  const ownVersion = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
  assert.match(res.stdout, new RegExp(`Installera paketet: npm install sitecms-next@\\^${ownVersion.replace(/\./g, "\\.")}`));
  assert.match(res.stdout, /I app\/layout\.tsx, sist i <body>:/);
  assert.match(res.stdout, /i next\.config\.mjs:/);
  assert.equal(read(dir, "app/layout.tsx"), "export default function L({ children }) { return children; }\n", "layouten rörs inte");
});

test("init: fel nyckel → snyggt 401-fel, inget skrivs", async () => {
  reset();
  const dir = project({ "package.json": "{}" });
  const res = await run(dir, ["init", "sk_fel"]);
  assert.equal(res.code, 1);
  assert.match(res.stderr, /godkändes inte av sitecms \(HTTP 401\)/);
  assert.equal(existsSync(join(dir, ".env.local")), false);
});

test("init: ingen nyckel och ingen TTY → instruktion", async () => {
  reset();
  const dir = project({ "package.json": "{}" });
  const res = await run(dir, ["init"]);
  assert.equal(res.code, 1);
  assert.match(res.stderr, /Ingen API-nyckel angiven/);
  assert.match(res.stderr, /npx sitecms-next init <nyckel>/);
});

const CONFIG = 'export default { pages: [{ slug: "home", title: "Start", blocks: [{ key: "a" }] }] };\n';

test("sync: nyckel-routes, slug-routes och siteUrl bara från produktionsmiljöer", async () => {
  const dir = project({ "sitecms.config.mjs": CONFIG });
  const K = { CMS_API_KEY: GOOD_KEY };
  const cases = [
    // [miljö, route, siteUrl, förväntad rad i utskriften]
    [K, "/api/v1/site/schema", undefined],
    [{ ...K, CMS_SITE: "testsajt" }, "/api/v1/sites/testsajt/schema", undefined],
    // Uttryckligen satta: alltid.
    [{ ...K, SITE_URL: "https://kund.se/" }, "/api/v1/site/schema", "https://kund.se", /sajtens adress https:\/\/kund\.se \(från SITE_URL\)/],
    [{ ...K, CMS_SITE_URL: "kund.se", VERCEL_ENV: "preview" }, "/api/v1/site/schema", "https://kund.se", /från CMS_SITE_URL/],
    [
      { ...K, CMS_SITE_URL: "https://a.se", SITE_URL: "https://b.se", NEXT_PUBLIC_SITE_URL: "https://c.se" },
      "/api/v1/site/schema",
      "https://a.se",
    ],
    // NEXT_PUBLIC_SITE_URL används inte längre.
    [{ ...K, NEXT_PUBLIC_SITE_URL: "https://c.se" }, "/api/v1/site/schema", undefined],
    // Vercel: bara production.
    [
      { ...K, VERCEL: "1", VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "kund.vercel.app" },
      "/api/v1/site/schema",
      "https://kund.vercel.app",
      /från VERCEL_PROJECT_PRODUCTION_URL/,
    ],
    [
      { ...K, VERCEL: "1", VERCEL_ENV: "preview", VERCEL_PROJECT_PRODUCTION_URL: "kund.vercel.app" },
      "/api/v1/site/schema",
      undefined,
      /VERCEL_PROJECT_PRODUCTION_URL skickas inte som sajtens adress \(VERCEL_ENV=preview, inte production\)/,
    ],
    [{ ...K, VERCEL_PROJECT_PRODUCTION_URL: "kund.vercel.app" }, "/api/v1/site/schema", undefined, /VERCEL_ENV=\(saknas\)/],
    // Netlify: bara CONTEXT=production (och bara när NETLIFY är satt).
    [{ ...K, URL: "https://kund.netlify.app", CONTEXT: "production" }, "/api/v1/site/schema", undefined],
    [
      { ...K, NETLIFY: "true", CONTEXT: "production", URL: "https://kund.netlify.app" },
      "/api/v1/site/schema",
      "https://kund.netlify.app",
      /från URL \(Netlify\)/,
    ],
    [
      { ...K, NETLIFY: "true", CONTEXT: "deploy-preview", URL: "https://kund.netlify.app" },
      "/api/v1/site/schema",
      undefined,
      /URL \(Netlify\) skickas inte som sajtens adress \(CONTEXT=deploy-preview, inte production\)/,
    ],
    [{ ...K, NETLIFY: "true", CONTEXT: "branch-deploy", URL: "https://kund.netlify.app" }, "/api/v1/site/schema", undefined],
    // Render: inte pull request-previews.
    [{ ...K, RENDER_EXTERNAL_URL: "https://kund.onrender.com" }, "/api/v1/site/schema", "https://kund.onrender.com"],
    [
      { ...K, RENDER_EXTERNAL_URL: "https://kund.onrender.com", IS_PULL_REQUEST: "false" },
      "/api/v1/site/schema",
      "https://kund.onrender.com",
    ],
    [
      { ...K, RENDER_EXTERNAL_URL: "https://kund-pr-4.onrender.com", IS_PULL_REQUEST: "true" },
      "/api/v1/site/schema",
      undefined,
      /RENDER_EXTERNAL_URL skickas inte som sajtens adress \(IS_PULL_REQUEST=true \(preview\)\)/,
    ],
    // Preview hoppas över men SITE_URL vinner ändå (uttrycklig).
    [
      { ...K, SITE_URL: "https://kund.se", VERCEL_ENV: "preview", VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app" },
      "/api/v1/site/schema",
      "https://kund.se",
    ],
  ];
  for (const [env, path, siteUrl, outputRe] of cases) {
    reset();
    const res = await run(dir, ["sync"], env);
    assert.equal(res.code, 0, res.stderr + res.stdout);
    const post = state.requests.find((r) => r.method === "POST");
    assert.equal(post.url, path, JSON.stringify(env));
    assert.equal(post.body.siteUrl, siteUrl, JSON.stringify(env));
    if (siteUrl) assert.match(res.stdout, new RegExp(`Revalidate-URL: ${siteUrl}/api/sitecms/revalidate`));
    if (outputRe) assert.match(res.stdout, outputRe, JSON.stringify(env));
  }

  // Preview-bygge i CI utan revalidate-URL → förklaring i stället för "sätt SITE_URL".
  reset();
  const preview = await run(dir, ["sync"], {
    ...K,
    VERCEL: "1",
    VERCEL_ENV: "preview",
    VERCEL_PROJECT_PRODUCTION_URL: "kund.vercel.app",
  });
  assert.match(preview.stdout, /Ingen revalidate-URL/);
  assert.match(preview.stdout, /Preview-bygge: sajtens adress skickas bara från produktionsbygget/);

  // Avvisad adress (localhost) → varning.
  reset();
  const local = await run(dir, ["sync"], { CMS_API_KEY: GOOD_KEY, SITE_URL: "http://localhost:3000" });
  assert.equal(local.code, 0);
  assert.match(local.stdout, /Ingen revalidate-URL/);
});

test("sync: revalidate-URL maskas i byggloggen", async () => {
  const dir = project({ "sitecms.config.mjs": CONFIG });
  const cases = [
    ["https://kund.se/api/sitecms/revalidate", "https://kund.se/api/sitecms/revalidate"],
    ["https://kund.se/api/sitecms/revalidate?token=hemlig", "https://kund.se/api/sitecms/revalidate"],
    ["https://api.netlify.com/build_hooks/64f0hemlig", "https://api.netlify.com/••••"],
    ["https://api.vercel.com/v1/integrations/deploy/prj_x/hemlig", "https://api.vercel.com/••••"],
    ["https://kund.se/api/sitecms/revalidate/extra-hemlig", "https://kund.se/••••"],
    // Redan maskad av servern: oförändrad.
    ["https://api.netlify.com/••••", "https://api.netlify.com/••••"],
  ];
  for (const [url, shown] of cases) {
    reset();
    state.schemaRevalidateUrl = url;
    const res = await run(dir, ["sync"], { CMS_API_KEY: GOOD_KEY });
    assert.equal(res.code, 0, res.stderr);
    assert.ok(res.stdout.includes(`Revalidate-URL: ${shown}\n`), res.stdout);
    assert.doesNotMatch(res.stdout + res.stderr, /hemlig/);
  }
});

test("sync: saknad nyckel i CI → varningsruta, exit 0; --strict → exit 1", async () => {
  reset();
  const dir = project({ "sitecms.config.mjs": CONFIG });
  for (const ciEnv of [{ CI: "1" }, { VERCEL: "1" }, { NETLIFY: "true" }, { CF_PAGES: "1" }, { RENDER: "true" }, { GITHUB_ACTIONS: "true" }]) {
    const res = await run(dir, ["sync"], ciEnv);
    assert.equal(res.code, 0, JSON.stringify(ciEnv));
    assert.match(res.stderr, /┌─+┐/);
    assert.match(res.stderr, /CMS_API_KEY saknas i byggmiljön/);
    assert.match(res.stderr, /synkades INTE/);
  }
  const strict = await run(dir, ["sync", "--strict"], { CI: "true" });
  assert.equal(strict.code, 1);

  const localRun = await run(dir, ["sync"]);
  assert.equal(localRun.code, 0);
  assert.doesNotMatch(localRun.stderr, /┌/);
  assert.equal(state.requests.length, 0);
});

test("check: visar webhook-status", async () => {
  const dir = project({});
  reset();
  state.revalidateUrl = "https://kund.se/api/sitecms/revalidate";
  state.webhook = { configured: true, lastStatus: "failed", lastAt: "2026-10-21T10:00:00.000Z", lastError: "HTTP 500" };
  let res = await run(dir, ["check"], { CMS_API_KEY: GOOD_KEY });
  assert.equal(res.code, 0, res.stderr);
  assert.match(res.stdout, /Ansluten till "Testsajt"/);
  assert.match(res.stdout, /Revalidate-URL: https:\/\/kund\.se\/api\/sitecms\/revalidate — senaste anrop: failed \(HTTP 500\)/);
  assert.equal(state.requests[0].url, "/api/v1/site/health");

  state.webhook = { configured: true, lastStatus: "ok", lastAt: "2026-10-21T10:00:00.000Z", lastError: null };
  res = await run(dir, ["check"], { CMS_API_KEY: GOOD_KEY, CMS_SITE: "testsajt" });
  assert.match(res.stdout, /senaste anrop: ok/);
  assert.equal(state.requests.at(-1).url, "/api/v1/sites/testsajt/health");

  state.revalidateUrl = null;
  res = await run(dir, ["check"], { CMS_API_KEY: GOOD_KEY });
  assert.match(res.stdout, /Ingen revalidate-URL — ändringar syns först vid nästa deploy/);

  res = await run(dir, ["check"], { CMS_API_KEY: "sk_fel" });
  assert.equal(res.code, 1);
  assert.match(res.stderr, /HTTP 401/);
});

test("check: revalidate-URL och URL:er i felmeddelandet maskas", async () => {
  const dir = project({});
  reset();
  state.revalidateUrl = "https://api.netlify.com/build_hooks/64f0hemlig";
  state.webhook = {
    configured: true,
    lastStatus: "failed",
    lastAt: "2026-10-21T10:00:00.000Z",
    lastError: "Kunde inte nå https://api.netlify.com/build_hooks/64f0hemlig.",
  };
  const res = await run(dir, ["check"], { CMS_API_KEY: GOOD_KEY });
  assert.equal(res.code, 0, res.stderr);
  assert.match(res.stdout, /Revalidate-URL: https:\/\/api\.netlify\.com\/•••• — senaste anrop: failed \(Kunde inte nå https:\/\/api\.netlify\.com\/••••\.\)/);
  assert.doesNotMatch(res.stdout + res.stderr, /hemlig/);
});

// ---------------------------------------------------------------------------
// init: package.json, BOM/CRLF, befintliga scripts, CMS_SITE
// ---------------------------------------------------------------------------

/** Alla filer i ett projekt (utom node_modules), med innehåll. */
function tree(dir, sub = "") {
  const out = {};
  for (const entry of readdirSync(join(dir, sub), { withFileTypes: true })) {
    const name = sub ? `${sub}/${entry.name}` : entry.name;
    if (name === "node_modules") continue;
    if (entry.isDirectory()) Object.assign(out, tree(dir, name));
    else out[name] = read(dir, name);
  }
  return out;
}

test("init: utan package.json → fel med instruktion, inget skrivs; --force sparar bara nyckeln", async () => {
  reset();
  const dir = project({ "app/page.tsx": "export default function Page() { return null; }\n" });
  const before = tree(dir);
  const res = await run(dir, ["init", GOOD_KEY]);
  assert.equal(res.code, 1);
  assert.match(res.stderr, /Hittar ingen package\.json/);
  assert.match(res.stderr, /rotkatalog/);
  assert.match(res.stderr, /--force/);
  assert.deepEqual(tree(dir), before);
  assert.equal(state.requests.length, 0, "inget anrop innan projektet är kontrollerat");

  const forced = await run(dir, ["init", GOOD_KEY, "--force"]);
  assert.equal(forced.code, 0, forced.stderr + forced.stdout);
  assert.equal(read(dir, ".env.local"), `CMS_API_KEY=${GOOD_KEY}\n`);
  assert.equal(read(dir, ".gitignore"), ".env.local\n");
  assert.deepEqual(Object.keys(tree(dir)).sort(), [".env.local", ".gitignore", "app/page.tsx"]);
  assert.match(forced.stdout, /Ingen package\.json \(--force\)/);
  assert.equal(state.requests.filter((r) => r.method === "POST").length, 0);
});

test("init: ogiltig package.json → fel innan .env.local skrivs", async () => {
  reset();
  const dir = project({ "package.json": '{ "name": "trasig", }\n', ".env.local": "OTHER=1\n" });
  const before = tree(dir);
  for (const args of [["init", GOOD_KEY], ["init", GOOD_KEY, "--force"]]) {
    const res = await run(dir, args);
    assert.equal(res.code, 1);
    assert.match(res.stderr, /package\.json är inte giltig JSON/);
    assert.match(res.stderr, /inget har ändrats/);
    assert.deepEqual(tree(dir), before);
  }
});

test("init: package.json med BOM, CRLF och tabbar bevaras; prebuild läggs före build", async () => {
  reset();
  const original =
    "﻿{\r\n" +
    '\t"name": "windows-kund",\r\n' +
    '\t"scripts": {\r\n' +
    '\t\t"dev": "next dev",\r\n' +
    '\t\t"build": "next build"\r\n' +
    "\t},\r\n" +
    '\t"dependencies": { "next": "15.0.0", "sitecms-next": "^0.4.0" }\r\n' +
    "}\r\n";
  const dir = project({ "package.json": original, "app/page.jsx": "export default () => null;\n" });
  const res = await run(dir, ["init", GOOD_KEY]);
  assert.equal(res.code, 0, res.stderr + res.stdout);
  assert.equal(
    read(dir, "package.json"),
    original.replace('\t\t"build": "next build"', '\t\t"prebuild": "sitecms-next sync",\r\n\t\t"build": "next build"'),
  );
  assert.ok(existsSync(join(dir, "app/api/sitecms/revalidate/route.js")), "BOM hindrar inte Next-detekteringen");
  assert.equal(state.requests.filter((r) => r.method === "POST").length, 1);
});

test("init: sitecms-next sync i build (eller annat script) → ingen dubbel prebuild", async () => {
  for (const scripts of [
    { build: "sitecms-next sync && next build" },
    { "cms:sync": "npx sitecms-next sync --strict", build: "npm run cms:sync && next build" },
    { prebuild: "sitecms-next  sync", build: "next build" },
  ]) {
    reset();
    const text = JSON.stringify({ name: "kund", scripts, dependencies: { next: "15.0.0", "sitecms-next": "^0.4.0" } }, null, 2) + "\n";
    const dir = project({ "package.json": text, "app/page.jsx": "export default () => null;\n" });
    const res = await run(dir, ["init", GOOD_KEY]);
    assert.equal(res.code, 0, res.stderr + res.stdout);
    assert.equal(read(dir, "package.json"), text, JSON.stringify(scripts));
    assert.match(res.stdout, /prebuild \(scripts\.\S+ kör redan sitecms-next sync\)/);
  }
});

test("init i 0.2-projekt: CMS_SITE varnas för, init använder bara nyckel-routerna", async () => {
  reset();
  const dir = project({
    "package.json": JSON.stringify({ name: "gammal", dependencies: { next: "15.0.0", "sitecms-next": "^0.4.0" } }, null, 2),
    "app/page.jsx": "export default () => null;\n",
  });
  // CMS_API_URL i .env.local pekar på mockservern (som i ett riktigt 0.2-projekt).
  writeFileSync(join(dir, ".env.local"), `CMS_API_URL=${baseUrl}\nCMS_SITE=gammal-sajt\n`);
  const res = await run(dir, ["init", GOOD_KEY], { CMS_API_URL: undefined });
  assert.equal(res.code, 0, res.stderr + res.stdout);
  assert.match(res.stderr, /┌─+┐/);
  assert.match(res.stderr, /CMS_SITE=gammal-sajt är satt \(\.env\.local\), men nyckeln gäller sajten "testsajt"/);
  assert.match(res.stderr, /Ta bort CMS_SITE/);
  assert.match(res.stdout, /Ta bort CMS_SITE \(\.env\.local och hos webbhotellet\)/);
  assert.ok(state.requests.length >= 3);
  for (const r of state.requests) assert.match(r.url, /^\/api\/v1\/site\//, `${r.method} ${r.url}`);
  assert.equal(read(dir, ".env.local"), `CMS_API_URL=${baseUrl}\nCMS_SITE=gammal-sajt\nCMS_API_KEY=${GOOD_KEY}\n`, "CMS_SITE tas inte bort automatiskt");

  // Samma sajt: mildare text, men fortfarande ett förslag att ta bort den.
  reset();
  const same = await run(dir, ["init", GOOD_KEY], { CMS_SITE: "testsajt" });
  assert.equal(same.code, 0, same.stderr + same.stdout);
  assert.match(same.stderr, /CMS_SITE=testsajt är satt \(miljön\)/);
  assert.match(same.stderr, /behövs inte längre/);
  for (const r of state.requests) assert.match(r.url, /^\/api\/v1\/site\//);
});

test("init: revalidate-URL från sitecms maskas i sammanfattningen", async () => {
  reset();
  state.revalidateUrl = "https://api.vercel.com/v1/integrations/deploy/prj_x/hemlig";
  const dir = project({
    "package.json": JSON.stringify({ name: "kund", dependencies: { next: "15.0.0", "sitecms-next": "^0.4.0" } }),
    "app/page.jsx": "export default () => null;\n",
  });
  const res = await run(dir, ["init", GOOD_KEY]);
  assert.equal(res.code, 0, res.stderr + res.stdout);
  assert.match(res.stdout, /Revalidate-URL i sitecms: https:\/\/api\.vercel\.com\/••••/);
  assert.doesNotMatch(res.stdout + res.stderr, /hemlig/);
});
