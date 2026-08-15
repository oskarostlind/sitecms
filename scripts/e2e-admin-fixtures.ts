/**
 * Fixtures for the admin browser E2E: a synthetic ADMIN account
 * (e2e-admin@sitecms.local, password rotated every run — synthetic
 * accounts may be rotated per the run-4 guardrail) plus lookups of the
 * ids the browser script needs. Also cleans up leftovers from earlier
 * runs (the UI-created "E2E Adminsajt" site and invited test user);
 * site delete is not a panel feature, so cleanup happens here.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, like } from "drizzle-orm";
import { db } from "../lib/db";
import { blocks, pages, sites, users } from "../lib/db/schema";

async function main() {
  // --- cleanup leftovers from previous admin-E2E runs (cascade deletes) ---
  await db.delete(sites).where(like(sites.slug, "e2e-adminsajt%"));
  await db.delete(users).where(eq(users.email, "e2e-invite@sitecms.local"));

  // --- synthetic admin account ---
  const password = randomBytes(12).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 12);
  const email = "e2e-admin@sitecms.local";
  let [admin] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!admin) {
    [admin] = await db
      .insert(users)
      .values({ email, name: "E2E Adminkonto (kan raderas)", role: "admin", passwordHash })
      .returning();
  } else {
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, admin.id));
  }

  // --- lookups ---
  const [e2eSite] = await db.select().from(sites).where(eq(sites.slug, "e2e-test")).limit(1);
  const [jjbygg] = await db.select().from(sites).where(eq(sites.slug, "jjbygg")).limit(1);
  if (!e2eSite || !jjbygg) throw new Error("expected sites missing");

  const [faqBlock] = await db
    .select({ id: blocks.id, pageId: blocks.pageId, value: blocks.value, key: blocks.key })
    .from(blocks)
    .where(and(eq(blocks.siteId, jjbygg.id), eq(blocks.key, "faq.a3")))
    .limit(1);
  if (!faqBlock) throw new Error("jjbygg faq.a3 block missing");

  const allSiteNames = (await db.select({ name: sites.name }).from(sites)).map((s) => s.name);

  console.log(
    JSON.stringify({
      email,
      password,
      e2eSiteId: e2eSite.id,
      jjbyggSiteId: jjbygg.id,
      jjbyggPageId: faqBlock.pageId,
      faqBlockId: faqBlock.id,
      faqKey: faqBlock.key,
      faqValue: faqBlock.value,
      allSiteNames,
    })
  );
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
