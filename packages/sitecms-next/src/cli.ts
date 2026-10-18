#!/usr/bin/env node
/**
 * sitecms-next CLI
 *
 *   sitecms-next sync [--prune] [--strict] [--config <fil>]   Synka sajtens fält till sitecms
 *   sitecms-next pull                                         Visa strukturen som finns i sitecms
 *   sitecms-next check                                        Kontrollera CMS_API_URL/CMS_SITE/CMS_API_KEY
 *
 * Läser CMS_API_URL, CMS_SITE och CMS_API_KEY från miljön, eller från
 * .env.local / .env i projektroten. Lägg "prebuild": "sitecms-next sync"
 * i package.json så synkas strukturen vid varje bygge.
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import type { SitecmsConfig } from "./index.js";

const CONFIG_NAMES = [
  "sitecms.config.ts",
  "sitecms.config.mts",
  "sitecms.config.mjs",
  "sitecms.config.js",
  "sitecms.config.json",
];

const cwd = process.cwd();
const args = process.argv.slice(2);
const command = args.find((a) => !a.startsWith("-")) ?? "help";
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const c = {
  dim: (s: string) => (process.stdout.isTTY ? `\x1b[2m${s}\x1b[0m` : s),
  green: (s: string) => (process.stdout.isTTY ? `\x1b[32m${s}\x1b[0m` : s),
  red: (s: string) => (process.stderr.isTTY ? `\x1b[31m${s}\x1b[0m` : s),
  yellow: (s: string) => (process.stdout.isTTY ? `\x1b[33m${s}\x1b[0m` : s),
};
const log = (s = "") => console.log(s);
const fail = (s: string): never => {
  console.error(c.red(`✖ ${s}`));
  process.exit(1);
};

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
      let value = rawValue.trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      } else {
        value = value.replace(/\s+#.*$/, "");
      }
      process.env[key] = value;
    }
  }
}

type Env = { apiUrl: string; site: string; apiKey: string };

function readEnv(): Env | null {
  const apiUrl = (process.env.CMS_API_URL ?? "").trim().replace(/\/+$/, "");
  const site = (process.env.CMS_SITE ?? "").trim();
  const apiKey = (process.env.CMS_API_KEY ?? "").trim();
  const missing = [
    !apiUrl && "CMS_API_URL",
    !site && "CMS_SITE",
    !apiKey && "CMS_API_KEY",
  ].filter(Boolean);
  if (missing.length) {
    console.error(c.yellow(`⚠ Saknar ${missing.join(", ")} (miljövariabler eller .env.local).`));
    return null;
  }
  return { apiUrl, site, apiKey };
}

async function api(env: Env, method: "GET" | "POST", path: string, body?: unknown) {
  const res = await fetch(`${env.apiUrl}/api/v1/sites/${encodeURIComponent(env.site)}${path}`, {
    method,
    headers: { "x-api-key": env.apiKey, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch((err: unknown) => fail(`Kunde inte nå ${env.apiUrl}: ${err instanceof Error ? err.message : String(err)}`));
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  return { status: res.status, json };
}

function findConfig(): string {
  const explicit = option("config");
  if (explicit) {
    const path = resolve(cwd, explicit);
    if (!existsSync(path)) fail(`Hittar inte ${explicit}.`);
    return path;
  }
  for (const name of CONFIG_NAMES) {
    const path = resolve(cwd, name);
    if (existsSync(path)) return path;
  }
  return fail(`Hittar ingen ${CONFIG_NAMES.slice(0, 1)} (eller .mjs/.js/.json) i ${cwd}.`);
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
    if (!mod.default) fail(`${path} måste ha en default-export (export default defineConfig({...})).`);
    return mod.default!;
  } catch (err) {
    const code = (err as { code?: string }).code;
    // Äldre Node utan inbyggd TypeScript-stöd: kör om med --experimental-strip-types.
    if (code === "ERR_UNKNOWN_FILE_EXTENSION" && /\.m?ts$/.test(path) && !process.env.__SITECMS_REEXEC) {
      if (tempCopy) rmSync(tempCopy, { force: true });
      const r = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", process.argv[1], ...args], {
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

async function sync() {
  const env = readEnv();
  if (!env) {
    if (flag("strict")) fail("Avbryter (--strict).");
    log(c.dim("Hoppar över schema-sync. Sätt variablerna (eller --strict för att låta bygget faila)."));
    return;
  }
  const configPath = findConfig();
  const config = await loadConfig(configPath);
  const body = { version: 1, ...config, ...(flag("prune") ? { prune: true } : {}) };

  log(c.dim(`sitecms: synkar ${configPath.replace(cwd + "/", "")} → ${env.apiUrl} (${env.site})`));
  const { status, json } = await api(env, "POST", "/schema", body);

  if (status !== 200 || !json?.ok) {
    console.error(c.red(`✖ Schema-sync misslyckades (HTTP ${status}): ${String(json?.error ?? "okänt fel")}`));
    const issues = Array.isArray(json?.issues) ? (json!.issues as unknown[]) : [];
    for (const issue of issues) {
      const text = typeof issue === "string" ? issue : JSON.stringify(issue);
      console.error(c.red(`  • ${text}`));
    }
    process.exit(1);
  }

  const created = json.created as { pages: number; blocks: number };
  const updated = json.updated as { pages: number; blocks: number };
  const pruned = (json.pruned as { pages: number; blocks: number } | undefined) ?? { pages: 0, blocks: 0 };
  const orphans = (json.orphans as { pageSlug: string; key: string }[] | undefined) ?? [];

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
}

async function pull() {
  const env = readEnv() ?? fail("Kan inte hämta strukturen utan miljövariablerna.");
  const { status, json } = await api(env, "GET", "/schema");
  if (status !== 200) fail(`HTTP ${status}: ${String(json?.error ?? "okänt fel")}`);
  log(JSON.stringify(json, null, 2));
}

async function check() {
  const env = readEnv() ?? fail("Sätt CMS_API_URL, CMS_SITE och CMS_API_KEY.");
  const { status, json } = await api(env, "GET", "/health");
  if (status !== 200) fail(`HTTP ${status}: ${String(json?.error ?? "okänt fel")}`);
  const site = json?.site as { name: string; slug: string };
  log(c.green("✔ ") + `Ansluten till "${site.name}" (${site.slug}) — ${json?.pages} sidor, senaste sync: ${json?.lastSchemaSyncAt ?? "aldrig"}.`);
}

function help() {
  log(`sitecms-next — koppla en Next.js-sajt till sitecms

  sitecms-next sync [--prune] [--strict] [--config <fil>]
      Skickar sitecms.config.ts till sitecms. Saknade sidor och fält skapas,
      kundens innehåll skrivs aldrig över. Saknas miljövariablerna hoppas
      steget över (exit 0) om inte --strict anges.
  sitecms-next pull     Skriver ut strukturen som finns i sitecms (JSON).
  sitecms-next check    Verifierar CMS_API_URL, CMS_SITE och CMS_API_KEY.

Dokumentation: https://sitecms-zeta.vercel.app/docs`);
}

loadEnvFiles();
const commands: Record<string, () => Promise<void> | void> = { sync, pull, check, help };
const run = commands[command] ?? (() => fail(`Okänt kommando "${command}". Kör sitecms-next help.`));
Promise.resolve(run()).catch((err: unknown) => fail(err instanceof Error ? err.message : String(err)));
