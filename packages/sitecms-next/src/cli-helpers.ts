/**
 * Rena hjälpfunktioner för CLI:t (ingen I/O), så att de kan testas direkt.
 * Ingår inte i paketets publika API.
 */

// ---------------------------------------------------------------------------
// Maskning av revalidate-URL:er (deploy hooks är hemligheter)
// ---------------------------------------------------------------------------

/** Standardsökvägen för revalidate-routen som `init` skapar. */
export const REVALIDATE_PATH = "/api/sitecms/revalidate";

/**
 * Visar en revalidate-URL utan att läcka hemligheter i byggloggen.
 * Sökvägen exakt /api/sitecms/revalidate visas som origin + sökväg (utan
 * query/hash); allt annat (t.ex. en deploy hook-URL, där sökvägen är
 * hemligheten) visas som `${origin}/••••`.
 */
export function maskRevalidateUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return "••••";
  }
  if (url.origin === "null") return "••••";
  const path = url.pathname.replace(/\/+$/, "");
  return path === REVALIDATE_PATH ? `${url.origin}${REVALIDATE_PATH}` : `${url.origin}/••••`;
}

/** Maskar alla http(s)-URL:er i en text (t.ex. ett felmeddelande från sitecms). */
export function maskUrlsInText(text: string): string {
  return text.replace(/https?:\/\/[^\s"'<>()]+/gi, (m) => {
    // Behåll avslutande skiljetecken utanför URL:en.
    const trail = m.match(/[.,;:!?]+$/)?.[0] ?? "";
    return maskRevalidateUrl(m.slice(0, m.length - trail.length)) + trail;
  });
}

// ---------------------------------------------------------------------------
// Sajtens adress (siteUrl) vid sync
// ---------------------------------------------------------------------------

export type EnvLike = Record<string, string | undefined>;

export type SiteUrlResolution = {
  /** Adressen som skickas som siteUrl, eller null. */
  siteUrl: { url: string; source: string } | null;
  /** Kandidater som fanns men inte användes, med orsak (t.ex. preview-bygge). */
  skipped: { source: string; reason: string }[];
};

/**
 * Sajtens publika adress, om byggmiljön anger den och ser ut som produktion.
 * sitecms sätter revalidate-URL:en från den bara när den är tom, så en
 * preview-adress får aldrig skickas — den skulle bli kvar för alltid.
 *
 * - CMS_SITE_URL, SITE_URL: alltid (uttryckligen satta).
 * - VERCEL_PROJECT_PRODUCTION_URL: bara när VERCEL_ENV=production.
 * - URL (Netlify): bara när NETLIFY är satt och CONTEXT=production.
 * - RENDER_EXTERNAL_URL: bara när IS_PULL_REQUEST inte är "true".
 */
export function resolveSiteUrl(env: EnvLike): SiteUrlResolution {
  const get = (name: string) => (env[name] ?? "").trim();
  const skipped: SiteUrlResolution["skipped"] = [];

  const candidates: { source: string; value: string; blocked: string | null }[] = [
    { source: "CMS_SITE_URL", value: get("CMS_SITE_URL"), blocked: null },
    { source: "SITE_URL", value: get("SITE_URL"), blocked: null },
    {
      source: "VERCEL_PROJECT_PRODUCTION_URL",
      value: get("VERCEL_PROJECT_PRODUCTION_URL"),
      blocked: get("VERCEL_ENV") === "production" ? null : `VERCEL_ENV=${get("VERCEL_ENV") || "(saknas)"}, inte production`,
    },
    {
      source: "URL (Netlify)",
      value: get("NETLIFY") ? get("URL") : "",
      blocked: get("CONTEXT") === "production" ? null : `CONTEXT=${get("CONTEXT") || "(saknas)"}, inte production`,
    },
    {
      source: "RENDER_EXTERNAL_URL",
      value: get("RENDER_EXTERNAL_URL"),
      blocked: get("IS_PULL_REQUEST") === "true" ? "IS_PULL_REQUEST=true (preview)" : null,
    },
  ];

  for (const { source, value, blocked } of candidates) {
    if (!value) continue;
    if (blocked) {
      skipped.push({ source, reason: blocked });
      continue;
    }
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
    try {
      const origin = new URL(withScheme).origin;
      if (origin === "null") throw new Error("ingen origin");
      return { siteUrl: { url: origin, source }, skipped };
    } catch {
      skipped.push({ source, reason: "ogiltig adress" });
    }
  }
  return { siteUrl: null, skipped };
}

// ---------------------------------------------------------------------------
// package.json
// ---------------------------------------------------------------------------

export type JsonObject = Record<string, unknown>;

export type ParsedPackageJson = {
  /** Filen började med en UTF-8 BOM (vanligt från Windows-editorer). */
  bom: boolean;
  /** Texten utan BOM. */
  text: string;
  data: JsonObject;
};

/** Parsar package.json (tål BOM). Kastar om innehållet inte är ett JSON-objekt. */
export function parsePackageJson(raw: string): ParsedPackageJson {
  const bom = raw.charCodeAt(0) === 0xfeff;
  const text = bom ? raw.slice(1) : raw;
  const data = JSON.parse(text) as unknown;
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("package.json måste vara ett JSON-objekt");
  return { bom, text, data: data as JsonObject };
}

const SYNC_RE = /\bsitecms-next\s+sync\b/;

/** Namnet på ett script som redan kör `sitecms-next sync` (prebuild och build först), annars null. */
export function findSyncScript(scripts: unknown): string | null {
  if (!scripts || typeof scripts !== "object") return null;
  const entries = Object.entries(scripts as Record<string, unknown>);
  const order = ["prebuild", "build"];
  entries.sort(([a], [b]) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia < 0 ? order.length : ia) - (ib < 0 ? order.length : ib);
  });
  for (const [name, value] of entries) {
    if (typeof value === "string" && SYNC_RE.test(value)) return name;
  }
  return null;
}

// Minimal JSON-skanner med positioner, så att package.json kan ändras på
// exakt ett ställe och resten av filen (indrag, radslut, inline-objekt,
// escapes) lämnas orörd.

type Member = { key: string; keyStart: number; keyEnd: number; valueStart: number; valueEnd: number; node: Node };
type Node =
  | { kind: "object"; start: number; end: number; members: Member[] }
  | { kind: "other"; start: number; end: number };

function scanJson(text: string): Node {
  let i = 0;
  const ws = () => {
    while (i < text.length && (text[i] === " " || text[i] === "\t" || text[i] === "\n" || text[i] === "\r")) i++;
  };
  const str = (): string => {
    const start = i;
    i++; // "
    while (i < text.length && text[i] !== '"') i += text[i] === "\\" ? 2 : 1;
    i++;
    return JSON.parse(text.slice(start, i)) as string;
  };
  const value = (): Node => {
    ws();
    const start = i;
    const ch = text[i];
    if (ch === "{") {
      i++;
      const members: Member[] = [];
      ws();
      if (text[i] === "}") {
        i++;
        return { kind: "object", start, end: i, members };
      }
      for (;;) {
        ws();
        const keyStart = i;
        const key = str();
        const keyEnd = i;
        ws();
        i++; // :
        const node = value();
        members.push({ key, keyStart, keyEnd, valueStart: node.start, valueEnd: node.end, node });
        ws();
        if (text[i] === ",") {
          i++;
          continue;
        }
        i++; // }
        return { kind: "object", start, end: i, members };
      }
    }
    if (ch === "[") {
      i++;
      ws();
      if (text[i] === "]") {
        i++;
        return { kind: "other", start, end: i };
      }
      for (;;) {
        value();
        ws();
        if (text[i] === ",") {
          i++;
          continue;
        }
        i++; // ]
        return { kind: "other", start, end: i };
      }
    }
    if (ch === '"') {
      str();
      return { kind: "other", start, end: i };
    }
    while (i < text.length && /[^\s,\]}]/.test(text[i])) i++;
    return { kind: "other", start, end: i };
  };
  return value();
}

/** Sista förekomsten av en nyckel (som JSON.parse). */
function member(node: Node, key: string): Member | undefined {
  if (node.kind !== "object") return undefined;
  return [...node.members].reverse().find((m) => m.key === key);
}

/** Blanktecknen före en medlems nyckel (radbrytning + indrag, eller ett mellanslag). */
function leadingWhitespace(text: string, m: Member): string {
  let s = m.keyStart;
  while (s > 0 && /[ \t\r\n]/.test(text[s - 1])) s--;
  return text.slice(s, m.keyStart);
}

export type PrebuildEdit =
  | { result: "ok"; foundIn: string; text: string }
  | { result: "added" | "extended"; text: string };

/**
 * Lägger till `sitecms-next sync` i scripts.prebuild med så liten ändring som
 * möjligt. Kör något script redan `sitecms-next sync` (t.ex. build) ändras
 * inget. BOM, radslut, indrag och avslutande radbrytning bevaras.
 */
export function addSyncToPrebuild(raw: string): PrebuildEdit {
  const { bom, text, data } = parsePackageJson(raw);
  const scripts = (data.scripts && typeof data.scripts === "object" ? data.scripts : {}) as Record<string, unknown>;
  const foundIn = findSyncScript(scripts);
  if (foundIn) return { result: "ok", foundIn, text: raw };

  const current = scripts.prebuild;
  const value = typeof current === "string" && current.trim() ? `${current} && sitecms-next sync` : "sitecms-next sync";
  const result: "added" | "extended" = current === undefined ? "added" : "extended";
  const eol = text.includes("\r\n") ? "\r\n" : "\n";

  let edited: string | null = null;
  try {
    edited = surgicalEdit(text, value, eol);
  } catch {
    edited = null;
  }
  // Kontrollera resultatet; vid minsta tvekan: serialisera om hela filen.
  let valid = false;
  if (edited !== null) {
    try {
      const after = JSON.parse(edited) as JsonObject;
      const { scripts: s, ...rest } = after;
      const { scripts: _before, ...restBefore } = data;
      valid =
        (s as Record<string, unknown>)?.prebuild === value &&
        JSON.stringify(rest) === JSON.stringify(restBefore) &&
        Object.keys(s as object).length === Object.keys(scripts).length + (current === undefined ? 1 : 0);
    } catch {
      valid = false;
    }
  }
  if (!edited || !valid) edited = reserialize(text, data, scripts, value, eol);
  return { result, text: (bom ? "﻿" : "") + edited };
}

function surgicalEdit(text: string, value: string, eol: string): string | null {
  const root = scanJson(text);
  if (root.kind !== "object") return null;
  const scriptsMember = member(root, "scripts");
  const v = JSON.stringify(value);

  if (scriptsMember) {
    const scripts = scriptsMember.node;
    if (scripts.kind !== "object") return null;
    const prebuild = member(scripts, "prebuild");
    if (prebuild) {
      // Byt bara värdet.
      return text.slice(0, prebuild.valueStart) + v + text.slice(prebuild.valueEnd);
    }
    const build = member(scripts, "build");
    if (build) {
      // Före build, med samma blanktecken och kolon-stil som build-raden.
      const lead = leadingWhitespace(text, build);
      const colon = text.slice(build.keyEnd, build.valueStart);
      const insert = `"prebuild"${colon}${v},${lead}`;
      return text.slice(0, build.keyStart) + insert + text.slice(build.keyStart);
    }
    const last = scripts.members.at(-1);
    if (last) {
      const lead = leadingWhitespace(text, last);
      const colon = text.slice(last.keyEnd, last.valueStart);
      return text.slice(0, last.valueEnd) + `,${lead}"prebuild"${colon}${v}` + text.slice(last.valueEnd);
    }
    // Tomt scripts-objekt.
    const lead = leadingWhitespace(text, scriptsMember);
    const inner = lead.includes("\n") ? lead.slice(lead.lastIndexOf("\n") + 1) : "";
    const unit = indentUnit(text);
    const colon = text.slice(scriptsMember.keyEnd, scriptsMember.valueStart);
    const obj = lead.includes("\n") ? `{${eol}${inner}${unit}"prebuild"${colon}${v}${eol}${inner}}` : `{ "prebuild"${colon}${v} }`;
    return text.slice(0, scripts.start) + obj + text.slice(scripts.end);
  }

  // Inget scripts: lägg till sist i rotobjektet.
  const last = root.members.at(-1);
  if (!last) return null;
  const lead = leadingWhitespace(text, last);
  const colon = text.slice(last.keyEnd, last.valueStart);
  let obj: string;
  if (lead.includes("\n")) {
    const inner = lead.slice(lead.lastIndexOf("\n") + 1);
    const unit = indentUnit(text);
    obj = `{${eol}${inner}${unit}"prebuild"${colon}${v}${eol}${inner}}`;
  } else {
    obj = `{ "prebuild"${colon}${v} }`;
  }
  return text.slice(0, last.valueEnd) + `,${lead}"scripts"${colon}${obj}` + text.slice(last.valueEnd);
}

function indentUnit(text: string): string {
  return text.match(/^[ \t]+(?=")/m)?.[0] ?? "  ";
}

/** Reserv: serialisera om hela filen med samma indrag, radslut och avslutande radbrytning. */
function reserialize(text: string, data: JsonObject, scripts: Record<string, unknown>, value: string, eol: string): string {
  let nextScripts: Record<string, unknown>;
  if ("prebuild" in scripts || !("build" in scripts)) {
    nextScripts = { ...scripts, prebuild: value };
  } else {
    nextScripts = {};
    for (const [k, v] of Object.entries(scripts)) {
      if (k === "build") nextScripts.prebuild = value;
      nextScripts[k] = v;
    }
  }
  let out = JSON.stringify({ ...data, scripts: nextScripts }, null, indentUnit(text));
  if (/\r?\n$/.test(text)) out += "\n";
  return eol === "\r\n" ? out.replace(/\n/g, "\r\n") : out;
}

// ---------------------------------------------------------------------------
// .env.local
// ---------------------------------------------------------------------------

export function parseEnvValue(rawValue: string): string {
  const value = rawValue.trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value.replace(/\s+#.*$/, "");
}

function envLineRe(name: string): RegExp {
  return new RegExp(`^(\\s*(?:export\\s+)?)${name}\\s*=(.*)$`);
}

/** Alla värden för NAME i en env-fil (okommenterade rader), i ordning. */
export function envFileValues(text: string, name: string): string[] {
  const re = envLineRe(name);
  const values: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(re);
    if (m) values.push(parseEnvValue(m[2]));
  }
  return values;
}

export type EnvUpsert = { result: "created" | "appended" | "replaced" | "unchanged"; text: string; replaced: string[] };

/**
 * Sätter NAME=value i en env-fils text utan att röra andra rader. En rad med
 * ett annat värde raderas inte utan kommenteras ut:
 *   # CMS_API_KEY=gammal (ersatt av sitecms-next init 2026-10-21)
 * Anroparen avgör om ett annat värde får ersättas (fråga / --force).
 */
export function upsertEnvText(existing: string | null, name: string, value: string, date: string): EnvUpsert {
  if (existing === null) return { result: "created", text: `${name}=${value}\n`, replaced: [] };
  const eol = existing.includes("\r\n") ? "\r\n" : "\n";
  const re = envLineRe(name);
  let found = false;
  const replaced: string[] = [];
  const out: string[] = [];
  for (const line of existing.split(/\r?\n/)) {
    const m = line.match(re);
    if (!m) {
      out.push(line);
      continue;
    }
    const same = parseEnvValue(m[2]) === value;
    if (!found) {
      found = true;
      if (same) {
        out.push(line);
      } else {
        replaced.push(parseEnvValue(m[2]));
        out.push(`# ${line.trim()} (ersatt av sitecms-next init ${date})`, `${m[1]}${name}=${value}`);
      }
    } else if (same) {
      out.push(line);
    } else {
      replaced.push(parseEnvValue(m[2]));
      out.push(`# ${line.trim()} (ersatt av sitecms-next init ${date})`);
    }
  }
  if (found) {
    return replaced.length ? { result: "replaced", text: out.join(eol), replaced } : { result: "unchanged", text: existing, replaced };
  }
  const sep = existing === "" || existing.endsWith("\n") ? "" : eol;
  return { result: "appended", text: `${existing}${sep}${name}=${value}${eol}`, replaced };
}

/** Visar början och slutet av en nyckel, t.ex. "sk_live_…a1b2". */
export function shortKey(key: string): string {
  return key.length <= 12 ? `${key.slice(0, 3)}…` : `${key.slice(0, 8)}…${key.slice(-4)}`;
}
