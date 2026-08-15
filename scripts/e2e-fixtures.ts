/**
 * Creates an isolated E2E test site + customer user used by scheduled runs
 * to verify prod behavior (e.g. Blob upload) without touching real
 * customer data. Idempotent. Prints a fresh password each run (rotating
 * the E2E user's password is fine — it is a synthetic account).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "../lib/db";
import { memberships, sites, users } from "../lib/db/schema";

async function main() {
  const password = randomBytes(12).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 12);

  let [site] = await db.select().from(sites).where(eq(sites.slug, "e2e-test")).limit(1);
  if (!site) {
    [site] = await db
      .insert(sites)
      .values({ name: "E2E Test (kan raderas)", slug: "e2e-test" })
      .returning();
  }

  const email = "e2e-test@sitecms.local";
  let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    [user] = await db
      .insert(users)
      .values({ email, name: "E2E Testkonto", role: "customer", passwordHash })
      .returning();
  } else {
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, user.id));
  }

  const [m] = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.userId, user.id), eq(memberships.siteId, site.id)))
    .limit(1);
  if (!m) {
    await db.insert(memberships).values({ userId: user.id, siteId: site.id });
  }

  console.log(JSON.stringify({ siteId: site.id, email, password }));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
