import { config } from "dotenv";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";
import * as schema from "./schema";

// Loads .env.local when running outside the Next.js runtime (e.g. scripts/seed.ts
// via tsx). Next.js itself already loads .env.local automatically.
if (!process.env.DATABASE_URL) {
  config({ path: ".env.local" });
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Add it to .env.local.");
}

/**
 * Production talks to Neon over HTTP (pooled, serverless-safe). For local
 * development and E2E tests against a plain Postgres (e.g. localhost), set
 * DATABASE_DRIVER=pg — the neon-http driver cannot reach a normal Postgres.
 * Both drivers expose the same query builder; the cast keeps one type for
 * every caller.
 */
function createDb() {
  if (process.env.DATABASE_DRIVER === "pg") {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
    return drizzlePg(pool, { schema }) as unknown as ReturnType<typeof drizzleNeon<typeof schema>>;
  }
  const sql = neon(process.env.DATABASE_URL!);
  return drizzleNeon(sql, { schema });
}

export const db = createDb();

export * from "./schema";
