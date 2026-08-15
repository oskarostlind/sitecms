import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// Loads .env.local when running outside the Next.js runtime (e.g. scripts/seed.ts
// via tsx). Next.js itself already loads .env.local automatically.
if (!process.env.DATABASE_URL) {
  config({ path: ".env.local" });
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Add it to .env.local.");
}

// Pooled connection (via neon-http driver) — safe for serverless/edge usage.
const sql = neon(process.env.DATABASE_URL);

export const db = drizzle(sql, { schema });

export * from "./schema";
