/**
 * Runs every SQL file in drizzle-manual/ that hasn't been applied yet, in
 * filename order, and records it in "_migrations". Runs automatically at the
 * start of `npm run build` (Vercel), so a deploy never needs a manual
 * database step. Files must be idempotent (IF NOT EXISTS etc.) — they are
 * re-runnable, which also makes the first run against a database that was
 * created with `drizzle-kit push` safe.
 *
 * Skipped (with a warning) when DATABASE_URL is missing and SKIP_MIGRATE=1,
 * so a local `next build` without a database still works.
 */
import { config } from "dotenv";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

async function main() {
  if (!url) {
    if (process.env.SKIP_MIGRATE === "1") {
      console.warn("[migrate] DATABASE_URL saknas — hoppar över (SKIP_MIGRATE=1).");
      return;
    }
    throw new Error("[migrate] DATABASE_URL saknas. Sätt SKIP_MIGRATE=1 för att bygga utan databas.");
  }

  const sql = neon(url);
  await sql`CREATE TABLE IF NOT EXISTS "_migrations" ("name" text PRIMARY KEY, "applied_at" timestamp with time zone DEFAULT now() NOT NULL)`;
  const appliedRows = (await sql`SELECT "name" FROM "_migrations"`) as { name: string }[];
  const applied = new Set(appliedRows.map((r) => r.name));

  const dir = join(process.cwd(), "drizzle-manual");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const body = readFileSync(join(dir, file), "utf8");
    console.log(`[migrate] kör ${file}`);
    // Neon's HTTP driver runs one statement per query; DO $$ ... $$ blocks
    // contain semicolons, so split on statement boundaries at line starts only.
    for (const statement of splitStatements(body)) {
      await sql.query(statement);
    }
    await sql`INSERT INTO "_migrations" ("name") VALUES (${file}) ON CONFLICT DO NOTHING`;
  }
  console.log(`[migrate] klart — ${files.length} fil(er), ${files.filter((f) => !applied.has(f)).length} nya.`);
}

function splitStatements(body: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inDollar = false;
  for (const rawLine of body.split("\n")) {
    const line = rawLine.replace(/--.*$/, "");
    if (!line.trim()) continue;
    if (line.includes("$$")) {
      const count = (line.match(/\$\$/g) ?? []).length;
      if (count % 2 === 1) inDollar = !inDollar;
    }
    current += line + "\n";
    if (!inDollar && line.trimEnd().endsWith(";")) {
      statements.push(current.trim());
      current = "";
    }
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
