#!/usr/bin/env node
/**
 * sitecms-next CLI
 *
 *   sitecms-next init [nyckel] [--force] [--no-install]       Koppla projektet till sitecms (en gång)
 *   sitecms-next sync [--prune] [--strict] [--config <fil>]   Synka sajtens fält till sitecms
 *   sitecms-next pull                                         Visa strukturen som finns i sitecms
 *   sitecms-next check                                        Kontrollera nyckeln och webhooken
 *
 * Det enda som krävs är CMS_API_KEY. CMS_API_URL (default https://sitecms.se)
 * och CMS_SITE (slug-routerna från 0.2.x) är valfria. Variablerna läses från
 * miljön, eller från .env.local / .env i projektroten. `init` lägger till
 * "prebuild": "sitecms-next sync" i package.json så att strukturen synkas
 * vid varje bygge.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { DEFAULT_API_URL, apiBase } from "./index.js";
import type { Health, SitecmsConfig } from "./index.js";
import {
  addSyncToPrebuild,
  envFileValues,
  maskRevalidateUrl,
  maskUrlsInText,
  parseEnvValue,
  parsePackageJson,
  resolveSiteUrl,
  shortKey,
  upsertEnvText,
} from "./cli-helpers.js";
import type { JsonObject } from "./cli-helpers.js";

const CONFIG_NAMES = [
  "sitecms.config.ts",
  "sitecms.config.mts",
  "sitecms.config.mjs",
  "sitecms.config.js",
  "sitecms.config.json",
];

const DOCS_URL = "https://sitecms.se/docs";
const ROUTE_FILES = ["route.ts", "route.tsx", "route.js", "route.jsx", "route.mjs"];
const CLI_FILE = fileURLToPath(import.meta.url);

const cwd = process.cwd();
const args = process.argv.slice(2);
/** Variabler som var satta innan .env.local/.env lästes in. */
const shellEnv = new Set(Object.keys(process.env).filter((k) => (process.env[k] ?? "").trim() !== ""));
const VALUE_OPTIONS = new Set(["config"]);
const positionals: string[] = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith("--")) {
    if (VALUE_OPTIONS.has(a.slice(2))) i++;
    continue;
  }
  if (a.startsWith("-")) continue;
  positionals.push(a);
}
const command = args.includes("--help") || args.includes("-h") ? "help" : (positionals[0] ?? "help");
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const c = {
  dim: (s: string) => (process.stdout.isTTY ? `\x1b[2m${s}\x1b[0m` : s),
  bold: (s: string) => (process.stdout.isTTY ? `\x1b[1m${s}\x1b[0m` : s),
  green: (s: string) => (process.stdout.isTTY ? `\x1b[32m${s}\x1b[0m` : s),
  red: (s: string) => (process.stderr.isTTY ? `\x1b[31m${s}\x1b[0m` : s),
  yellow: (s: string) => (process.stdout.isTTY ? `\x1b[33m${s}\x1b[0m` : s),
  yellowErr: (s: string) => (process.stderr.isTTY ? `\x1b[33m${s}\x1b[0m` : s),
};
const log = (s = "") => console.log(s);

class CliError extends Error {}
const fail = (s: string): never => {
  throw new CliError(s);
};

const rel = (path: string) => relative(cwd, path).split("\\").join("/") || ".";

function envVar(name: string): string {
  return (process.env[name] ?? "").trim();
}

/** Laddar .env.local och .env utan att skriva över befintliga variabler. */
function loadEnvFiles() {
  for (const file of [".env.local", ".env"]) {
    const path = resolve(cwd, file);
    if (!existsSync(path)) continue;
    for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      const [, key, rawValue] = m;
      if (process.env[key] !== undefined) continue;
      process.env[key] = parseEnvValue(rawValue);
    }
  }
}

type Env = { apiUrl: string; site: string; apiKey: string };

/** CMS_API_KEY krävs; CMS_API_URL och CMS_SITE är valfria. null om nyckeln saknas. */
function readEnv(): Env | null {
  const apiKey = envVar("CMS_API_KEY");
  if (!apiKey) return null;
  return {
    apiUrl: (envVar("CMS_API_URL") || DEFAULT_API_URL).replace(/\/+$/, ""),
    site: envVar("CMS_SITE"),
    apiKey,
  };
}

function describeTarget(env: Env): string {
  return env.site ? `${env.apiUrl} (${env.site})` : env.apiUrl;
}

async function api(env: Env, method: "GET" | "POST", path: string, body?: unknown) {
  const res = await fetch(`${apiBase(env.apiUrl, env.site)}${path}`, {
    method,
    headers: { "x-api-key": env.apiKey, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch((err: unknown) => fail(`Kunde inte nå ${env.apiUrl}: ${err instanceof Error ? err.message : String(err)}`));
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  return { status: res.status, json };
}

const CI_VARS = [
  "CI",
  "CONTINUOUS_INTEGRATION",
  "BUILD_NUMBER",
  "VERCEL",
  "NETLIFY",
  "CF_PAGES",
  "RENDER",
  "GITHUB_ACTIONS",
  "GITLAB_CI",
  "CIRCLECI",
  "BUILDKITE",
  "TRAVIS",
  "JENKINS_URL",
  "TEAMCITY_VERSION",
  "BITBUCKET_BUILD_NUMBER",
  "CODEBUILD_BUILD_ID",
  "TF_BUILD",
  "RAILWAY_ENVIRONMENT",
  "DIGITALOCEAN_APP_ID",
  "AMPLIFY_APP_ID",
];

function isCI(): boolean {
  return CI_VARS.some((name) => {
    const value = envVar(name).toLowerCase();
    return value !== "" && value !== "false" && value !== "0";
  });
}

/** Tydlig ruta på stderr, syns även i långa bygg-loggar. */
function warnBox(lines: string[]) {
  const width = Math.max(...lines.map((l) => l.length));
  const border = "─".repeat(width + 2);
  const out = [`┌${border}┐`, ...lines.map((l) => `│ ${l.padEnd(width)} │`), `└${border}┘`];
  console.error(c.yellowErr(out.join("\n")));
}

function findConfigPath(): string | null {
  for (const name of CONFIG_NAMES) {
    const path = resolve(cwd, name);
    if (existsSync(path)) return path;
  }
  return null;
}

function findConfig(): string {
  const explicit = option("config");
  if (explicit) {
    const path = resolve(cwd, explicit);
    if (!existsSync(path)) fail(`Hittar inte ${explicit}.`);
    return path;
  }
  return findConfigPath() ?? fail(`Hittar ingen ${CONFIG_NAMES[0]} (eller .mjs/.js/.json) i ${cwd}. Kör \`npx sitecms-next init\`.`);
}

async function loadConfig(path: string): Promise<SitecmsConfig> {
  if (path.endsWith(".json")) return JSON.parse(readFileSync(path, "utf8")) as SitecmsConfig;

  // En .ts-fil i ett projekt utan "type": "module" (som de flesta Next-projekt)
  // ger annars en varning från Node. En tillfällig .mts-kopia bredvid
  // originalet läses alltid som ESM och löser importer från samma node_modules.
  let importPath = path;
  let tempCopy: string | null = null;
  if (path.endsWith(".ts")) {
    tempCopy = resolve(dirname(path), `.sitecms.config.${process.pid}.mts`);
    writeFileSync(tempCopy, readFileSync(path, "utf8"));
    importPath = tempCopy;
  }

  try {
    const mod = (await import(pathToFileURL(importPath).href)) as { default?: SitecmsConfig };
    if (!mod.default) fail(`${rel(path)} måste ha en default-export (export default defineConfig({...})).`);
    return mod.default!;
  } catch (err) {
    const code = (err as { code?: string }).code;
    // Äldre Node utan inbyggd TypeScript-stöd: kör om med --experimental-strip-types.
    if (code === "ERR_UNKNOWN_FILE_EXTENSION" && /\.m?ts$/.test(path) && !process.env.__SITECMS_REEXEC) {
      if (tempCopy) rmSync(tempCopy, { force: true });
      const r = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", CLI_FILE, ...args], {
        stdio: "inherit",
        env: { ...process.env, __SITECMS_REEXEC: "1" },
      });
      process.exit(r.status ?? 1);
    }
    throw err;
  } finally {
    if (tempCopy) rmSync(tempCopy, { force: true });
  }
}

// ---------------------------------------------------------------------------
// sync / pull / check
// ---------------------------------------------------------------------------

async function sync() {
  const env = readEnv();
  if (!env) {
    if (isCI()) {
      warnBox([
        "⚠  sitecms: CMS_API_KEY saknas i byggmiljön.",
        "",
        "Innehållsstrukturen (sitecms.config) synkades INTE till sitecms,",
        "och sajten kan inte hämta innehåll från sitecms utan nyckeln.",
        "",
        "Lägg in CMS_API_KEY som miljövariabel hos ditt webbhotell",
        "(Vercel, Netlify, Cloudflare, egen server …) och deploya om.",
        "Nyckeln finns under Integration för sajten i sitecms-panelen.",
      ]);
    } else {
      console.error(c.yellowErr("⚠ CMS_API_KEY saknas (miljövariabel eller .env.local)."));
    }
    if (flag("strict")) fail("Avbryter (--strict).");
    log(c.dim("Hoppar över schema-sync. Kör `npx sitecms-next init`, eller använd --strict för att låta bygget faila."));
    return;
  }
  const configPath = findConfig();
  const config = await loadConfig(configPath);
  // Sajtens adress skickas bara från produktionsbyggen: sitecms sätter
  // revalidate-URL:en från den när den är tom, och en preview-adress skulle
  // annars bli kvar för alltid.
  const { siteUrl: site, skipped } = resolveSiteUrl(process.env);
  const body = {
    version: 1,
    ...config,
    ...(flag("prune") ? { prune: true } : {}),
    ...(site ? { siteUrl: site.url } : {}),
  };

  log(c.dim(`sitecms: synkar ${rel(configPath)} → ${describeTarget(env)}`));
  if (site) log(c.dim(`sitecms: sajtens adress ${site.url} (från ${site.source})`));
  for (const s of skipped) log(c.dim(`sitecms: ${s.source} skickas inte som sajtens adress (${s.reason}).`));
  const previewSkipped = !site && skipped.some((s) => s.reason !== "ogiltig adress");
  const { status, json } = await api(env, "POST", "/schema", body);

  if (status !== 200 || !json?.ok) {
    const issues = Array.isArray(json?.issues) ? (json!.issues as unknown[]) : [];
    const lines = issues.map((issue) => `  • ${typeof issue === "string" ? issue : JSON.stringify(issue)}`);
    fail([`Schema-sync misslyckades (HTTP ${status}): ${String(json?.error ?? "okänt fel")}`, ...lines].join("\n"));
  }

  const created = json!.created as { pages: number; blocks: number };
  const updated = json!.updated as { pages: number; blocks: number };
  const pruned = (json!.pruned as { pages: number; blocks: number } | undefined) ?? { pages: 0, blocks: 0 };
  const orphans = (json!.orphans as { pageSlug: string; key: string }[] | undefined) ?? [];

  log(
    c.green("✔ ") +
      `Skapade ${created.pages} sidor och ${created.blocks} fält, uppdaterade ${updated.pages} sidor och ${updated.blocks} fält` +
      (pruned.pages || pruned.blocks ? `, tog bort ${pruned.pages} sidor och ${pruned.blocks} fält` : "") +
      ".",
  );
  if (orphans.length) {
    log(c.yellow(`⚠ ${orphans.length} fält finns i sitecms men inte i configen (behålls; kör med --prune för att ta bort):`));
    for (const o of orphans.slice(0, 20)) log(c.yellow(`  • ${o.pageSlug} / ${o.key}`));
    if (orphans.length > 20) log(c.yellow(`  … och ${orphans.length - 20} till`));
  }

  if (typeof json!.revalidateUrl === "string" && json!.revalidateUrl) {
    // Maskas: en deploy hook-URL är en hemlighet och byggloggar kan vara publika.
    log(c.green("✔ ") + `Revalidate-URL: ${maskRevalidateUrl(json!.revalidateUrl)}`);
  } else if (json!.revalidateUrl === null && (site || isCI())) {
    log(c.yellow("⚠ Ingen revalidate-URL i sitecms — ändringar syns först vid nästa deploy."));
    log(
      c.dim(
        site
          ? `  ${site.url} godtogs inte (måste vara en publik https-adress). Fyll i URL:en under Integration i panelen.`
          : previewSkipped
            ? "  Preview-bygge: sajtens adress skickas bara från produktionsbygget. Sätt SITE_URL=https://din-domän.se\n" +
              "  i produktionsmiljön, eller fyll i URL:en under Integration i panelen."
            : "  Sätt SITE_URL=https://din-domän.se i byggmiljön, eller fyll i URL:en under Integration i panelen.",
      ),
    );
  }
}

async function pull() {
  const env = readEnv() ?? fail("CMS_API_KEY saknas. Kör `npx sitecms-next init` eller sätt CMS_API_KEY.");
  const { status, json } = await api(env, "GET", "/schema");
  if (status !== 200) fail(`HTTP ${status}: ${String(json?.error ?? "okänt fel")}`);
  log(JSON.stringify(json, null, 2));
}

/** Skriver ut webhook-status från health (om sitecms-versionen skickar den). */
function printWebhookStatus(health: Partial<Health>) {
  if (!("revalidateUrl" in health) && !health.webhook) return; // äldre sitecms
  const url = health.revalidateUrl;
  if (!url) {
    log(c.yellow("⚠ Ingen revalidate-URL — ändringar syns först vid nästa deploy."));
    log(c.dim("  Fyll i den under Integration i sitecms-panelen (eller kör sync i byggmiljön med SITE_URL satt)."));
    return;
  }
  const w = health.webhook;
  let last = "inget anrop ännu";
  if (w?.lastStatus === "ok") last = `ok${w.lastAt ? ` (${w.lastAt})` : ""}`;
  else if (w?.lastStatus === "failed") last = `failed${w.lastError ? ` (${maskUrlsInText(w.lastError)})` : ""}`;
  // Maskas: en deploy hook-URL är en hemlighet och loggar kan vara publika.
  const line = `Revalidate-URL: ${maskRevalidateUrl(url)} — senaste anrop: ${last}`;
  log(w?.lastStatus === "failed" ? c.yellow(`⚠ ${line}`) : c.green("✔ ") + line);
}

async function check() {
  const env =
    readEnv() ?? fail("CMS_API_KEY saknas. Kör `npx sitecms-next init` eller sätt CMS_API_KEY (miljövariabel eller .env.local).");
  const { status, json } = await api(env, "GET", "/health");
  if (status === 401) fail(`API-nyckeln godkändes inte av ${describeTarget(env)} (HTTP 401): ${String(json?.error ?? "")}`);
  if (status !== 200) fail(`HTTP ${status}: ${String(json?.error ?? "okänt fel")}`);
  const health = json as unknown as Health;
  log(
    c.green("✔ ") +
      `Ansluten till "${health.site.name}" (${health.site.slug}) via ${env.apiUrl} — ${health.pages} sidor, senaste sync: ${health.lastSchemaSyncAt ?? "aldrig"}.`,
  );
  printWebhookStatus(health);
}

// ---------------------------------------------------------------------------
// init
// ---------------------------------------------------------------------------

function readPackageJson(path: string): JsonObject | null {
  if (!existsSync(path)) return null;
  try {
    return parsePackageJson(readFileSync(path, "utf8")).data;
  } catch (err) {
    return fail(
      `${rel(path)} är inte giltig JSON (${err instanceof Error ? err.message : String(err)}).\n` +
        "  Rätta filen och kör init igen — inget har ändrats.",
    );
  }
}

function dependencies(pkg: JsonObject | null): Record<string, string> {
  return {
    ...((pkg?.dependencies as Record<string, string> | undefined) ?? {}),
    ...((pkg?.devDependencies as Record<string, string> | undefined) ?? {}),
  };
}

function ownVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(resolve(dirname(CLI_FILE), "../package.json"), "utf8")) as { version?: string };
    return pkg.version ?? "0.5.0";
  } catch {
    return "0.5.0";
  }
}

async function promptKey(): Promise<string> {
  if (!process.stdin.isTTY) {
    fail(
      "Ingen API-nyckel angiven.\n" +
        "  Kör `npx sitecms-next init <nyckel>` eller sätt CMS_API_KEY i miljön/.env.local.\n" +
        "  Nyckeln finns under Integration för sajten i sitecms-panelen.",
    );
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question("API-nyckel (Integration för sajten i sitecms-panelen): ")).trim();
    return answer || fail("Ingen nyckel angiven.");
  } finally {
    rl.close();
  }
}

async function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return /^(j|ja|y|yes)$/i.test((await rl.question(`${question} [j/N] `)).trim());
  } finally {
    rl.close();
  }
}

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Enkel .gitignore-matchning för filer i projektroten. */
function gitignoreMatches(pattern: string, file: string): boolean {
  if (pattern.endsWith("/")) return false;
  const p = pattern.replace(/^\//, "").replace(/^\*\*\//, "");
  if (p.includes("/")) return false;
  const source = p
    .split("")
    .map((ch) => (ch === "*" ? "[^/]*" : ch === "?" ? "[^/]" : ch.replace(/[.+^${}()|[\]\\]/g, "\\$&")))
    .join("");
  return new RegExp(`^${source}$`).test(file);
}

function ensureGitignore(path: string): "created" | "appended" | "ok" {
  if (!existsSync(path)) {
    writeFileSync(path, ".env.local\n");
    return "created";
  }
  const text = readFileSync(path, "utf8");
  const covered = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && !l.startsWith("!"))
    .some((p) => gitignoreMatches(p, ".env.local"));
  if (covered) return "ok";
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const sep = text === "" || text.endsWith("\n") ? "" : eol;
  writeFileSync(path, `${text}${sep}.env.local${eol}`);
  return "appended";
}

type SchemaPageLike = {
  slug: string;
  title: string;
  description?: string | null;
  blocks?: { key: string; type?: string; label?: string | null; help?: string | null; default?: string }[];
};

const EXAMPLE_PAGES: SchemaPageLike[] = [
  {
    slug: "home",
    title: "Startsida",
    blocks: [
      { key: "hero.title", label: "Rubrik", help: "Max 60 tecken", default: "Välkommen" },
      { key: "hero.image", type: "image", label: "Hero-bild" },
      { key: "intro.body", type: "richtext", label: "Ingress" },
    ],
  },
];

function renderConfig(pages: SchemaPageLike[], fromSchema: boolean): string {
  const s = (v: string) => JSON.stringify(v);
  const out = [`import { defineConfig } from "sitecms-next";`, ""];
  out.push(
    fromSchema
      ? "// Skapad av `sitecms-next init` från strukturen som redan finns i sitecms."
      : "// Exempel skapat av `sitecms-next init` — byt mot sajtens egna sidor och fält.",
    "// `sitecms-next sync` (körs före varje bygge) skapar det som saknas i sitecms.",
    "// Kundens innehåll skrivs aldrig över.",
    "export default defineConfig({",
    "  pages: [",
  );
  for (const page of pages) {
    out.push("    {", `      slug: ${s(page.slug)},`, `      title: ${s(page.title)},`);
    if (page.description) out.push(`      description: ${s(page.description)},`);
    out.push("      blocks: [");
    for (const b of page.blocks ?? []) {
      const fields = [`key: ${s(b.key)}`];
      if (b.type && b.type !== "text") fields.push(`type: ${s(b.type)}`);
      if (b.label) fields.push(`label: ${s(b.label)}`);
      if (b.help) fields.push(`help: ${s(b.help)}`);
      if (b.default) fields.push(`default: ${s(b.default)}`);
      out.push(`        { ${fields.join(", ")} },`);
    }
    out.push("      ],", "    },");
  }
  out.push("  ],", "});", "");
  return out.join("\n");
}

function installCommand(): { cmd: string; args: string[] } {
  // cmd.exe tolkar ^ som escape-tecken utanför citattecken.
  const spec = process.platform === "win32" ? `"sitecms-next@^${ownVersion()}"` : `sitecms-next@^${ownVersion()}`;
  const has = (f: string) => existsSync(resolve(cwd, f));
  if (has("pnpm-lock.yaml")) return { cmd: "pnpm", args: ["add", spec] };
  if (has("yarn.lock")) return { cmd: "yarn", args: ["add", spec] };
  if (has("bun.lockb") || has("bun.lock")) return { cmd: "bun", args: ["add", spec] };
  return { cmd: "npm", args: ["install", spec] };
}

/** Var CMS_SITE kommer ifrån: miljön, eller .env.local/.env. */
function cmsSiteSource(): string {
  if (shellEnv.has("CMS_SITE")) return "miljön";
  const where: string[] = [];
  for (const file of [".env.local", ".env"]) {
    const path = resolve(cwd, file);
    if (existsSync(path) && envFileValues(readFileSync(path, "utf8"), "CMS_SITE").some(Boolean)) where.push(file);
  }
  return where.length ? where.join(" och ") : "miljön";
}

async function init() {
  const done: string[] = [];
  const skipped: string[] = [];
  const notes: string[] = [];
  const force = flag("force");

  // 1. package.json kontrolleras (och parsas) innan något skrivs, så att ett
  //    fel aldrig lämnar ett halvfärdigt resultat efter sig.
  const pkgPath = resolve(cwd, "package.json");
  let pkg = readPackageJson(pkgPath);
  if (!pkg && !force) {
    fail(
      `Hittar ingen package.json i ${cwd}.\n` +
        "  Kör `npx sitecms-next init` i projektets rotkatalog (där package.json finns).\n" +
        "  Vill du ändå bara spara CMS_API_KEY i .env.local här: lägg till --force.",
    );
  }

  // 2. Nyckel: argument → CMS_API_KEY (miljö/.env.local) → fråga.
  const key = (positionals[1] ?? "").trim() || envVar("CMS_API_KEY") || (await promptKey());

  // 3. Validera mot sitecms. Allt init gör använder nyckel-routerna
  //    (/api/v1/site/…), aldrig CMS_SITE: en ny nyckel för en annan sajt får
  //    inte krocka med en gammal CMS_SITE.
  const keyEnv: Env = { apiUrl: (envVar("CMS_API_URL") || DEFAULT_API_URL).replace(/\/+$/, ""), site: "", apiKey: key };
  log(c.dim(`sitecms: kontrollerar nyckeln mot ${keyEnv.apiUrl} …`));
  const health = await api(keyEnv, "GET", "/health");
  if (health.status === 401) {
    fail(
      "API-nyckeln godkändes inte av sitecms (HTTP 401).\n" +
        "  Kopiera nyckeln igen under Integration för sajten i sitecms-panelen och kör\n" +
        "  `npx sitecms-next init <nyckel>`.",
    );
  }
  if (health.status !== 200 || !health.json?.ok) {
    fail(`Kunde inte verifiera nyckeln (HTTP ${health.status}): ${String(health.json?.error ?? "okänt fel")}`);
  }
  const info = health.json as unknown as Health;
  log(c.green("✔ ") + `Nyckeln gäller sajten "${info.site.name}" (${info.site.slug}).`);

  // 4. 0.2-projekt: CMS_SITE gör att sajten använder slug-routerna.
  const cmsSite = envVar("CMS_SITE");
  if (cmsSite) {
    const where = cmsSiteSource();
    const lines =
      cmsSite === info.site.slug
        ? [
            `⚠  CMS_SITE=${cmsSite} är satt (${where}).`,
            "",
            "Den behövs inte längre — nyckeln identifierar sajten. Med CMS_SITE satt",
            "använder sajten de äldre slug-routerna (fungerar, men ta gärna bort",
            `CMS_SITE från ${where} och hos webbhotellet).`,
          ]
        : [
            `⚠  CMS_SITE=${cmsSite} är satt (${where}), men nyckeln gäller sajten "${info.site.slug}".`,
            "",
            "Med CMS_SITE satt hämtar sajten innehåll via /api/v1/sites/" + cmsSite + "/…,",
            "och den nya nyckeln godkänns inte där. Ta bort CMS_SITE från",
            `${where} och hos webbhotellet — nyckeln identifierar sajten.`,
            "(init använder nyckeln och påverkas inte.)",
          ];
    warnBox(lines);
    notes.push(`Ta bort CMS_SITE (${where} och hos webbhotellet) — nyckeln identifierar sajten.`);
  }

  // 5. En annan CMS_API_KEY i .env.local ersätts bara efter bekräftelse.
  const envPath = resolve(cwd, ".env.local");
  const envText = existsSync(envPath) ? readFileSync(envPath, "utf8") : null;
  const otherKeys = envText === null ? [] : envFileValues(envText, "CMS_API_KEY").filter((v) => v !== key);
  if (otherKeys.length && !force) {
    const question = `.env.local har redan en annan CMS_API_KEY (${shortKey(otherKeys[0])}). Ersätta den? Den gamla raden kommenteras ut.`;
    if (!process.stdin.isTTY) {
      fail(
        `.env.local har redan en annan CMS_API_KEY (${shortKey(otherKeys[0])}).\n` +
          "  Kör med --force för att ersätta den (den gamla raden kommenteras ut, inget raderas).\n" +
          "  Inget har ändrats.",
      );
    }
    if (!(await confirm(question))) fail("Avbrutet — inget har ändrats.");
  }

  process.env.CMS_API_KEY = key;

  // 6. .env.local
  const envEdit = upsertEnvText(envText, "CMS_API_KEY", key, today());
  if (envEdit.result !== "unchanged") writeFileSync(envPath, envEdit.text);
  if (envEdit.result === "created") done.push(".env.local (CMS_API_KEY)");
  else if (envEdit.result === "appended") done.push("CMS_API_KEY i .env.local");
  else if (envEdit.result === "replaced") done.push("CMS_API_KEY i .env.local (ny nyckel; den gamla raden är utkommenterad)");
  else skipped.push("CMS_API_KEY i .env.local (fanns redan)");

  // 7. .gitignore
  const gitResult = ensureGitignore(resolve(cwd, ".gitignore"));
  if (gitResult === "created") done.push(".gitignore (med .env.local)");
  else if (gitResult === "appended") done.push(".env.local i .gitignore");
  else skipped.push(".gitignore (täcker redan .env.local)");

  // 8. Projekttyp
  const appDir = existsSync(resolve(cwd, "src/app")) ? "src/app" : existsSync(resolve(cwd, "app")) ? "app" : null;
  const isAppRouter = Boolean(dependencies(pkg).next) && appDir !== null;
  const useTs = existsSync(resolve(cwd, "tsconfig.json"));

  // 9. Paketet (behövs för revalidate-routen och configen)
  if (pkg) {
    const current = dependencies(pkg)["sitecms-next"];
    // Före 0.4 saknas sitecms-next/preview (som preview-routen importerar).
    const outdated = typeof current === "string" && /^[\^~>=v\s]*0\.[0-3](\.|$)/.test(current);
    if (current && !outdated) {
      skipped.push(`sitecms-next i package.json (${current})`);
    } else if (flag("no-install")) {
      notes.push(`Installera paketet: npm install sitecms-next@^${ownVersion()}`);
    } else {
      const { cmd, args: installArgs } = installCommand();
      log(c.dim(`sitecms: ${cmd} ${installArgs.join(" ")}`));
      const r = spawnSync(cmd, installArgs, { stdio: "inherit", shell: process.platform === "win32" });
      if (r.status === 0) {
        done.push(`sitecms-next@^${ownVersion()} (${cmd})`);
        pkg = readPackageJson(pkgPath);
      } else {
        notes.push(`Installationen misslyckades — kör: ${cmd} ${installArgs.join(" ")}`);
      }
    }
  }

  // 10. Revalidate- och preview-route (bara Next.js App Router). Skrivs aldrig över.
  if (isAppRouter) {
    const routes: { dir: string; lines: string[] }[] = [
      {
        dir: "api/sitecms/revalidate",
        lines: [
          "// sitecms anropar den här routen när kunden sparar; cachen töms och sajten",
          "// visar det nya innehållet direkt. Anropet är signerat med CMS_API_KEY.",
          'export { POST } from "sitecms-next/revalidate";',
        ],
      },
      {
        dir: "api/sitecms/preview",
        lines: [
          "// Live-förhandsgranskning: panelen öppnar sajten i en iframe via den här routen",
          "// (verifierar token mot sitecms och slår på draft mode).",
          'export { GET } from "sitecms-next/preview";',
        ],
      },
    ];
    for (const route of routes) {
      const routeDir = resolve(cwd, appDir!, route.dir);
      const existing = ROUTE_FILES.find((f) => existsSync(join(routeDir, f)));
      if (existing) {
        skipped.push(`${rel(join(routeDir, existing))} (fanns redan)`);
        continue;
      }
      const routePath = join(routeDir, useTs ? "route.ts" : "route.js");
      mkdirSync(routeDir, { recursive: true });
      writeFileSync(routePath, [...route.lines, ""].join("\n"));
      done.push(rel(routePath));
    }
  }

  // 11. sitecms.config (+ prebuild + sync) — bara i Node-projekt
  let configPath = findConfigPath();
  let syncOk: boolean | null = null;
  if (!pkg) {
    notes.push("Ingen package.json (--force) — hoppade över paketet, revalidate-routen, sitecms.config, prebuild och sync.");
  } else {
    if (configPath) {
      skipped.push(`${rel(configPath)} (fanns redan)`);
    } else {
      const schema = await api(keyEnv, "GET", "/schema").catch(() => null);
      const pages = schema?.status === 200 && Array.isArray(schema.json?.pages) ? (schema.json!.pages as SchemaPageLike[]) : [];
      const fromSchema = pages.length > 0;
      configPath = resolve(cwd, useTs ? "sitecms.config.ts" : "sitecms.config.mjs");
      writeFileSync(configPath, renderConfig(fromSchema ? pages : EXAMPLE_PAGES, fromSchema));
      done.push(
        `${rel(configPath)} (${fromSchema ? `${pages.length} ${pages.length === 1 ? "sida" : "sidor"} från sitecms` : "exempel"})`,
      );
    }

    const prebuild = addSyncToPrebuild(readFileSync(pkgPath, "utf8"));
    if (prebuild.result === "ok") {
      skipped.push(`prebuild (scripts.${prebuild.foundIn} kör redan sitecms-next sync)`);
    } else {
      writeFileSync(pkgPath, prebuild.text);
      done.push(
        prebuild.result === "added" ? '"prebuild": "sitecms-next sync" i package.json' : "sitecms-next sync i befintlig prebuild",
      );
    }
    if (existsSync(resolve(cwd, ".yarnrc.yml")) && (prebuild.result !== "ok" || prebuild.foundIn === "prebuild")) {
      notes.push('Yarn 2+ kör inte prebuild — ändra build till "sitecms-next sync && next build".');
    }

    // 12. Synka direkt (egen process: läser .env.local och configen som ett
    //     vanligt bygge). CMS_SITE="" → nyckel-routerna även om en gammal
    //     CMS_SITE finns kvar (en tom variabel skrivs inte över från .env.local).
    log("");
    const r = spawnSync(process.execPath, [CLI_FILE, "sync"], {
      stdio: "inherit",
      env: { ...process.env, CMS_API_KEY: key, CMS_SITE: "" },
    });
    syncOk = r.status === 0;
    if (!syncOk) notes.push("Synken misslyckades (se ovan). Rätta och kör `npx sitecms-next sync`.");
  }

  // 13. Sammanfattning
  log("");
  log(c.bold(`sitecms är kopplat till "${info.site.name}".`));
  if (done.length) {
    log("");
    log("  Skapat/uppdaterat:");
    for (const d of done) log(`    ${c.green("✔")} ${d}`);
  }
  if (skipped.length) {
    log("");
    log("  Hoppade över:");
    for (const s of skipped) log(c.dim(`    • ${s}`));
  }
  if (notes.length) {
    log("");
    for (const n of notes) log(c.yellow(`  ⚠ ${n}`));
  }
  log("");
  if (isAppRouter) {
    if (info.revalidateUrl) {
      log(`  Revalidate-URL i sitecms: ${maskRevalidateUrl(info.revalidateUrl)}`);
    } else {
      log("  Revalidate-URL:en sätts automatiskt när produktionsbygget körs hos webbhotellet (om det");
      log("  anger sajtens adress; annars sätt SITE_URL=https://din-domän.se eller fyll i");
      log("  https://din-domän.se/api/sitecms/revalidate under Integration i panelen).");
    }
  } else if (pkg) {
    log("  Det här ser inte ut som ett Next.js-projekt med App Router (ingen next i package.json");
    log("  eller ingen app-katalog), så ingen revalidate-route skapades. Skapa i stället en");
    log("  deploy hook (build hook) hos ditt webbhotell och klistra in dess URL som revalidate-URL");
    log("  under Integration i sitecms-panelen — då byggs sajten om när kunden sparar.");
  }
  log("");
  log(
    c.bold("Nästa steg: ") +
      "Lägg CMS_API_KEY=… som miljövariabel hos ditt webbhotell (Vercel, Netlify, Cloudflare, egen server …) och deploya.",
  );
  if (isAppRouter) printPreviewSteps(appDir!, useTs);
  if (syncOk === false) process.exitCode = 1;
}

/** Det som init inte gör automatiskt för live-förhandsgranskningen. */
function printPreviewSteps(appDir: string, useTs: boolean) {
  const ext = useTs ? "tsx" : "jsx";
  const layout = ["tsx", "jsx", "js"].map((e) => `${appDir}/layout.${e}`).find((f) => existsSync(resolve(cwd, f))) ?? `${appDir}/layout.${ext}`;
  const config =
    ["next.config.ts", "next.config.mjs", "next.config.js", "next.config.cjs"].find((f) => existsSync(resolve(cwd, f))) ??
    (useTs ? "next.config.ts" : "next.config.mjs");
  log("");
  log(c.bold("Live-förhandsgranskning") + c.dim(" (valfritt — klicka-för-att-redigera i panelen):"));
  log(`  1. I ${layout}, sist i <body>:`);
  log(c.dim('       import { SitecmsPreview } from "sitecms-next/preview";'));
  log(c.dim("       <SitecmsPreview />"));
  log("  2. Markera redigerbara element med editable():");
  log(c.dim('       import { editable } from "sitecms-next";'));
  log(c.dim('       <h1 {...editable("home", "hero.title")}>…</h1>'));
  log(`  3. Låt panelen bädda in sajten — i ${config}:`);
  log(c.dim('       import { previewFrameHeaders } from "sitecms-next/preview";'));
  log(c.dim('       async headers() { return [{ source: "/:path*", headers: previewFrameHeaders() }]; }'));
  log("     och ta bort X-Frame-Options om sajten sätter den (CSP frame-ancestors ersätter den).");
  log(c.dim(`  Layouten och ${config} ändras inte automatiskt. Mer: ${DOCS_URL}`));
}

function help() {
  log(`sitecms-next — koppla en sajt till sitecms

  sitecms-next init [nyckel] [--force] [--no-install]
      Kopplar projektet: verifierar API-nyckeln, sparar CMS_API_KEY i
      .env.local, skapar revalidate- och preview-routen (Next.js App Router)
      och sitecms.config.ts, lägger till "prebuild": "sitecms-next sync" och
      synkar. Skriver ut stegen för live-förhandsgranskning (layouten ändras
      inte automatiskt).
      Körs i katalogen med package.json (--force: spara ändå bara nyckeln).
      Kan köras flera gånger. Routerna och sitecms.config skrivs
      aldrig över; .env.local, .gitignore och package.json kompletteras med
      en rad var utan att annat ändras. En annan CMS_API_KEY i .env.local
      ersätts bara efter bekräftelse eller med --force, och den gamla raden
      kommenteras ut i stället för att raderas.
  sitecms-next sync [--prune] [--strict] [--config <fil>]
      Skickar sitecms.config.ts till sitecms. Saknade sidor och fält skapas,
      kundens innehåll skrivs aldrig över. Saknas CMS_API_KEY hoppas steget
      över (exit 0, med varning i CI) om inte --strict anges.
  sitecms-next pull     Skriver ut strukturen som finns i sitecms (JSON).
  sitecms-next check    Verifierar nyckeln och visar webhook-status.

Miljövariabler
  CMS_API_KEY            Krävs. Finns under Integration i sitecms-panelen.
  CMS_API_URL            Valfri, default ${DEFAULT_API_URL}.
  CMS_SITE               Valfri (äldre slug-routes, som 0.2.x).
  CMS_REVALIDATE_SECRET  Valfri (äldre revalidate-hemlighet).
  SITE_URL               Valfri. Sajtens adress; skickas vid sync så att
                         sitecms kan sätta revalidate-URL:en (om den är tom).
                         Utan SITE_URL/CMS_SITE_URL används webbhotellets
                         adress, men bara i produktionsbyggen:
                         VERCEL_PROJECT_PRODUCTION_URL (VERCEL_ENV=production),
                         URL på Netlify (CONTEXT=production) och
                         RENDER_EXTERNAL_URL (inte pull request-previews).

Dokumentation: ${DOCS_URL}`);
}

loadEnvFiles();
const commands: Record<string, () => Promise<void> | void> = { init, sync, pull, check, help };
const run = commands[command] ?? (() => fail(`Okänt kommando "${command}". Kör sitecms-next help.`));
Promise.resolve()
  .then(run)
  .catch((err: unknown) => {
    console.error(c.red(`✖ ${err instanceof Error ? err.message : String(err)}`));
    process.exit(1);
  });
