// CLI-tester mot dist/cli.js och en lokal mock av sitecms (node:http).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PKG_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(PKG_DIR, "dist", "cli.js");
const GOOD_KEY = "sk_test_godkand";

const state = {
  schemaPages: [],
  revalidateUrl: null,
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
        revalidateUrl: body.siteUrl && !body.siteUrl.includes("localhost") ? `${body.siteUrl}/api/sitecms/revalidate` : null,
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
  state.webhook = { configured: false, lastStatus: null, lastAt: null, lastError: null };
  state.requests = [];
}

/** Kör CLI:t asynkront (servern lever i samma process). */
function run(cwd, args, extraEnv = {}) {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [CLI, ...args], {
      cwd,
      env: { PATH: process.env.PATH, HOME: cwd, CMS_API_URL: baseUrl, ...extraEnv },
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
    dependencies: { next: "15.0.0", "sitecms-next": "^0.3.0" },
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
  assert.equal(existsSync(join(dir, "app")), false);

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
  const files = [".env.local", ".gitignore", "package.json", "sitecms.config.ts", "src/app/api/sitecms/revalidate/route.ts"];
  const before = snapshot(dir, files);
  const second = await run(dir, ["init"]);
  assert.equal(second.code, 0, second.stderr + second.stdout);
  assert.deepEqual(snapshot(dir, files), before);
  assert.match(second.stdout, /Hoppade över/);
  assert.match(second.stdout, /fanns redan/);
  assert.equal(read(dir, ".env.local").match(/CMS_API_KEY=/g).length, 1);
});

test("init: config från befintlig struktur, app/ utan TypeScript, befintlig nyckel uppdateras", async () => {
  reset();
  state.schemaPages = [
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
  const dir = project({
    "package.json": '{\n  "name": "kund2",\n  "dependencies": { "next": "14.2.0", "sitecms-next": "^0.3.0" }\n}',
    "app/page.jsx": "export default function Page() { return null; }\n",
    ".gitignore": "node_modules\n.env*\n",
    ".env.local": "export CMS_API_KEY=gammal\nFOO=bar",
  });

  const res = await run(dir, ["init", GOOD_KEY]);
  assert.equal(res.code, 0, res.stderr + res.stdout);
  assert.equal(read(dir, ".env.local"), `export CMS_API_KEY=${GOOD_KEY}\nFOO=bar`);
  assert.equal(read(dir, ".gitignore"), "node_modules\n.env*\n");
  assert.ok(existsSync(join(dir, "app/api/sitecms/revalidate/route.js")));

  const config = read(dir, "sitecms.config.mjs");
  assert.match(config, /slug: "om-oss"/);
  assert.match(config, /description: "Företaget"/);
  assert.match(config, /\{ key: "intro", label: "Ingress" \}/);
  assert.match(config, /\{ key: "hero.bild", type: "image", label: "Bild \\"stor\\"", help: "Liggande" \}/);

  const pkgText = read(dir, "package.json");
  assert.equal(JSON.parse(pkgText).scripts.prebuild, "sitecms-next sync");
  assert.ok(!pkgText.endsWith("\n"), "ingen avslutande radbrytning tillagd");

  const post = state.requests.find((r) => r.method === "POST");
  assert.deepEqual(post.body.pages.map((p) => p.slug), ["om-oss"]);
  assert.equal(post.body.pages[0].blocks[1].label, 'Bild "stor"');
});

test("init: inte Next.js → ingen route, instruktion om deploy hook", async () => {
  reset();
  const dir = project({
    "package.json": JSON.stringify({ name: "astro-sajt", dependencies: { astro: "4.0.0", "sitecms-next": "^0.3.0" } }, null, 2),
  });
  const res = await run(dir, ["init", GOOD_KEY]);
  assert.equal(res.code, 0, res.stderr + res.stdout);
  assert.equal(existsSync(join(dir, "app")), false);
  assert.equal(existsSync(join(dir, "src/app")), false);
  assert.match(res.stdout, /deploy hook/);
  assert.ok(existsSync(join(dir, "sitecms.config.mjs")));
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

test("sync: nyckel-routes, slug-routes och siteUrl från miljön", async () => {
  const dir = project({ "sitecms.config.mjs": CONFIG });
  const cases = [
    [{ CMS_API_KEY: GOOD_KEY }, "/api/v1/site/schema", undefined],
    [{ CMS_API_KEY: GOOD_KEY, CMS_SITE: "testsajt" }, "/api/v1/sites/testsajt/schema", undefined],
    [{ CMS_API_KEY: GOOD_KEY, SITE_URL: "https://kund.se/" }, "/api/v1/site/schema", "https://kund.se"],
    [{ CMS_API_KEY: GOOD_KEY, VERCEL_PROJECT_PRODUCTION_URL: "kund.vercel.app" }, "/api/v1/site/schema", "https://kund.vercel.app"],
    [{ CMS_API_KEY: GOOD_KEY, URL: "https://kund.netlify.app" }, "/api/v1/site/schema", undefined],
    [{ CMS_API_KEY: GOOD_KEY, NETLIFY: "true", URL: "https://kund.netlify.app" }, "/api/v1/site/schema", "https://kund.netlify.app"],
    [{ CMS_API_KEY: GOOD_KEY, RENDER_EXTERNAL_URL: "https://kund.onrender.com" }, "/api/v1/site/schema", "https://kund.onrender.com"],
    [
      { CMS_API_KEY: GOOD_KEY, CMS_SITE_URL: "https://a.se", SITE_URL: "https://b.se", NEXT_PUBLIC_SITE_URL: "https://c.se" },
      "/api/v1/site/schema",
      "https://a.se",
    ],
  ];
  for (const [env, path, siteUrl] of cases) {
    reset();
    const res = await run(dir, ["sync"], env);
    assert.equal(res.code, 0, res.stderr + res.stdout);
    const post = state.requests.find((r) => r.method === "POST");
    assert.equal(post.url, path, JSON.stringify(env));
    assert.equal(post.body.siteUrl, siteUrl, JSON.stringify(env));
    if (siteUrl) assert.match(res.stdout, new RegExp(`Revalidate-URL: ${siteUrl}/api/sitecms/revalidate`));
  }

  // Avvisad adress (localhost) → varning.
  reset();
  const local = await run(dir, ["sync"], { CMS_API_KEY: GOOD_KEY, SITE_URL: "http://localhost:3000" });
  assert.equal(local.code, 0);
  assert.match(local.stdout, /Ingen revalidate-URL/);
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
