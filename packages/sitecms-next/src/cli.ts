#!/usr/bin/env node
/**
 * sitecms-next CLI
 *
 *   sitecms-next init [nyckel]                                Koppla projektet till sitecms (en gång)
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

const CONFIG_NAMES = [
  "sitecms.config.ts",
  "sitecms.config.mts",
  "sitecms.config.mjs",
  "sitecms.config.js",
  "sitecms.config.json",
];

const DOCS_URL = "https://sitecms.se/docs";
const CLI_FILE = fileURLToPath(import.meta.url);

const cwd = process.cwd();
const args = process.argv.slice(2);
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

function parseEnvValue(rawValue: string): string {
  let value = rawValue.trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value.replace(/\s+#.*$/, "");
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

/**
 * Sajtens publika adress, om byggmiljön anger den. Skickas med vid sync så
 * att sitecms kan sätta revalidate-URL:en automatiskt (skriver aldrig över).
 */
function siteUrlFromEnv(): { url: string; source: string } | null {
  const candidates: [string, string][] = [
    ["CMS_SITE_URL", envVar("CMS_SITE_URL")],
    ["SITE_URL", envVar("SITE_URL")],
    ["NEXT_PUBLIC_SITE_URL", envVar("NEXT_PUBLIC_SITE_URL")],
    ["VERCEL_PROJECT_PRODUCTION_URL", envVar("VERCEL_PROJECT_PRODUCTION_URL")],
    ["URL", envVar("NETLIFY") ? envVar("URL") : ""],
    ["RENDER_EXTERNAL_URL", envVar("RENDER_EXTERNAL_URL")],
  ];
  for (const [source, value] of candidates) {
    if (!value) continue;
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
    try {
      return { url: new URL(withScheme).origin, source };
    } catch {
      // Ogiltigt värde — prova nästa.
    }
  }
  return null;
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
  const site = siteUrlFromEnv();
  const body = {
    version: 1,
    ...config,
    ...(flag("prune") ? { prune: true } : {}),
    ...(site ? { siteUrl: site.url } : {}),
  };

  log(
    c.dim(
      `sitecms: synkar ${rel(configPath)} → ${describeTarget(env)}` + (site ? ` · sajt ${site.url} (${site.source})` : ""),
    ),
  );
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
    log(c.green("✔ ") + `Revalidate-URL: ${json!.revalidateUrl}`);
  } else if (json!.revalidateUrl === null && (site || isCI())) {
    log(c.yellow("⚠ Ingen revalidate-URL i sitecms — ändringar syns först vid nästa deploy."));
    log(
      c.dim(
        site
          ? `  ${site.url} godtogs inte (måste vara en publik https-adress). Fyll i URL:en under Integration i panelen.`
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
  else if (w?.lastStatus === "failed") last = `failed${w.lastError ? ` (${w.lastError})` : ""}`;
  const line = `Revalidate-URL: ${url} — senaste anrop: ${last}`;
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

type JsonObject = Record<string, unknown>;

function readPackageJson(path: string): JsonObject | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as JsonObject;
  } catch {
    return fail(`${rel(path)} är inte giltig JSON.`);
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
    return pkg.version ?? "0.3.0";
  } catch {
    return "0.3.0";
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

/** Skriver/uppdaterar NAME=value i en env-fil utan att röra andra rader. */
function upsertEnvValue(path: string, name: string, value: string): "created" | "appended" | "updated" | "unchanged" {
  if (!existsSync(path)) {
    writeFileSync(path, `${name}=${value}\n`);
    return "created";
  }
  const text = readFileSync(path, "utf8");
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const re = new RegExp(`^(\\s*(?:export\\s+)?)${name}\\s*=(.*)$`);
  let found = false;
  let changed = false;
  const lines = text.split(/\r?\n/).map((line) => {
    const m = line.match(re);
    if (!m) return line;
    found = true;
    if (parseEnvValue(m[2]) === value) return line;
    changed = true;
    return `${m[1]}${name}=${value}`;
  });
  if (found) {
    if (!changed) return "unchanged";
    writeFileSync(path, lines.join(eol));
    return "updated";
  }
  const sep = text === "" || text.endsWith("\n") ? "" : eol;
  writeFileSync(path, `${text}${sep}${name}=${value}${eol}`);
  return "appended";
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

/** Lägger till `sitecms-next sync` i prebuild och bevarar filens formatering. */
function ensurePrebuild(path: string): "added" | "extended" | "ok" {
  const text = readFileSync(path, "utf8");
  const pkg = JSON.parse(text) as JsonObject;
  const scripts = (pkg.scripts as Record<string, string> | undefined) ?? {};
  const current = scripts.prebuild;
  if (typeof current === "string" && /\bsitecms-next\s+sync\b/.test(current)) return "ok";

  const value = typeof current === "string" && current.trim() ? `${current} && sitecms-next sync` : "sitecms-next sync";
  let nextScripts: Record<string, string>;
  if (current !== undefined || !("build" in scripts)) {
    nextScripts = { ...scripts, prebuild: value };
  } else {
    // Lägg prebuild direkt före build.
    nextScripts = {};
    for (const [k, v] of Object.entries(scripts)) {
      if (k === "build") nextScripts.prebuild = value;
      nextScripts[k] = v;
    }
  }
  pkg.scripts = nextScripts;

  const indent = text.match(/^[ \t]+(?=")/m)?.[0] ?? 2;
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  let out = JSON.stringify(pkg, null, indent);
  if (/\r?\n$/.test(text)) out += "\n";
  writeFileSync(path, eol === "\r\n" ? out.replace(/\n/g, "\r\n") : out);
  return current === undefined ? "added" : "extended";
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

async function init() {
  const done: string[] = [];
  const skipped: string[] = [];
  const notes: string[] = [];

  // 1. Nyckel: argument → CMS_API_KEY (miljö/.env.local) → fråga.
  const key = (positionals[1] ?? "").trim() || envVar("CMS_API_KEY") || (await promptKey());

  // 2. Validera mot sitecms (nyckel-routen; ingen slug behövs).
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
  process.env.CMS_API_KEY = key;

  // 3. .env.local
  const envResult = upsertEnvValue(resolve(cwd, ".env.local"), "CMS_API_KEY", key);
  if (envResult === "created") done.push(".env.local (CMS_API_KEY)");
  else if (envResult === "appended") done.push("CMS_API_KEY i .env.local");
  else if (envResult === "updated") done.push("CMS_API_KEY i .env.local (ny nyckel)");
  else skipped.push("CMS_API_KEY i .env.local (fanns redan)");

  // 4. .gitignore
  const gitResult = ensureGitignore(resolve(cwd, ".gitignore"));
  if (gitResult === "created") done.push(".gitignore (med .env.local)");
  else if (gitResult === "appended") done.push(".env.local i .gitignore");
  else skipped.push(".gitignore (täcker redan .env.local)");

  // 5. Projekttyp
  const pkgPath = resolve(cwd, "package.json");
  let pkg = readPackageJson(pkgPath);
  const appDir = existsSync(resolve(cwd, "src/app")) ? "src/app" : existsSync(resolve(cwd, "app")) ? "app" : null;
  const isAppRouter = Boolean(dependencies(pkg).next) && appDir !== null;
  const useTs = existsSync(resolve(cwd, "tsconfig.json"));

  // 6. Paketet (behövs för revalidate-routen och configen)
  if (pkg) {
    const current = dependencies(pkg)["sitecms-next"];
    const outdated = typeof current === "string" && /^[\^~>=v\s]*0\.[0-2](\.|$)/.test(current);
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

  // 7. Revalidate-route (bara Next.js App Router)
  if (isAppRouter) {
    const routeDir = resolve(cwd, appDir!, "api/sitecms/revalidate");
    const existing = ["route.ts", "route.tsx", "route.js", "route.jsx", "route.mjs"].find((f) => existsSync(join(routeDir, f)));
    if (existing) {
      skipped.push(`${rel(join(routeDir, existing))} (fanns redan)`);
    } else {
      const routePath = join(routeDir, useTs ? "route.ts" : "route.js");
      mkdirSync(routeDir, { recursive: true });
      writeFileSync(
        routePath,
        [
          "// sitecms anropar den här routen när kunden sparar; cachen töms och sajten",
          "// visar det nya innehållet direkt. Anropet är signerat med CMS_API_KEY.",
          'export { POST } from "sitecms-next/revalidate";',
          "",
        ].join("\n"),
      );
      done.push(rel(routePath));
    }
  }

  // 8. sitecms.config (+ prebuild + sync) — bara i Node-projekt
  let configPath = findConfigPath();
  let syncOk: boolean | null = null;
  if (!pkg) {
    notes.push("Ingen package.json — hoppade över sitecms.config, prebuild och sync.");
  } else {
    if (configPath) {
      skipped.push(`${rel(configPath)} (fanns redan)`);
    } else {
      const schema = await api(readEnv() ?? keyEnv, "GET", "/schema").catch(() => null);
      const pages = schema?.status === 200 && Array.isArray(schema.json?.pages) ? (schema.json!.pages as SchemaPageLike[]) : [];
      const fromSchema = pages.length > 0;
      configPath = resolve(cwd, useTs ? "sitecms.config.ts" : "sitecms.config.mjs");
      writeFileSync(configPath, renderConfig(fromSchema ? pages : EXAMPLE_PAGES, fromSchema));
      done.push(
        `${rel(configPath)} (${fromSchema ? `${pages.length} ${pages.length === 1 ? "sida" : "sidor"} från sitecms` : "exempel"})`,
      );
    }

    const prebuild = ensurePrebuild(pkgPath);
    if (prebuild === "added") done.push('"prebuild": "sitecms-next sync" i package.json');
    else if (prebuild === "extended") done.push("sitecms-next sync i befintlig prebuild");
    else skipped.push("prebuild (kör redan sitecms-next sync)");
    if (existsSync(resolve(cwd, ".yarnrc.yml"))) {
      notes.push('Yarn 2+ kör inte prebuild — ändra build till "sitecms-next sync && next build".');
    }

    // 9. Synka direkt (egen process: läser .env.local och configen som ett vanligt bygge).
    log("");
    const r = spawnSync(process.execPath, [CLI_FILE, "sync"], {
      stdio: "inherit",
      env: { ...process.env, CMS_API_KEY: key },
    });
    syncOk = r.status === 0;
    if (!syncOk) notes.push("Synken misslyckades (se ovan). Rätta och kör `npx sitecms-next sync`.");
  }

  // 10. Sammanfattning
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
      log(`  Revalidate-URL i sitecms: ${info.revalidateUrl}`);
    } else {
      log("  Revalidate-URL:en sätts automatiskt när bygget körs hos webbhotellet (om det anger");
      log("  sajtens adress; annars sätt SITE_URL=https://din-domän.se eller fyll i");
      log("  https://din-domän.se/api/sitecms/revalidate under Integration i panelen).");
    }
  } else {
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
  if (syncOk === false) process.exitCode = 1;
}

function help() {
  log(`sitecms-next — koppla en sajt till sitecms

  sitecms-next init [nyckel]
      Kopplar projektet: verifierar API-nyckeln, sparar CMS_API_KEY i
      .env.local, skapar revalidate-routen (Next.js App Router) och
      sitecms.config.ts, lägger till "prebuild": "sitecms-next sync" och synkar.
      Kan köras flera gånger; befintliga filer skrivs inte över.
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
                         sitecms kan sätta revalidate-URL:en.

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
