/**
 * Idempotent seed script for auth users (admin + customer) and the
 * customer's site membership.
 *
 * Re-running this script is safe: existing users keep their current
 * password (never rotated on re-run) and only have name/role refreshed;
 * the membership insert is skipped if it already exists.
 *
 * Run with: npx tsx scripts/seed-users.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "../lib/db";
import { memberships, sites, users } from "../lib/db/schema";

function generatePassword(length = 12): string {
  // Avoids visually ambiguous characters (0/O, 1/l/I).
  const charset =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset[randomInt(charset.length)];
  }
  return password;
}

type SeedUser = {
  email: string;
  name: string;
  role: "admin" | "customer";
};

type UpsertResult = {
  id: string;
  password: string | null; // null when the user already existed
  created: boolean;
};

async function upsertUser(seed: SeedUser): Promise<UpsertResult> {
  const email = seed.email.toLowerCase().trim();

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    // Idempotent: never rotate an existing password on re-run. Only keep
    // name/role in sync with the seed definition.
    await db
      .update(users)
      .set({ name: seed.name, role: seed.role, updatedAt: new Date() })
      .where(eq(users.id, existing.id));

    return { id: existing.id, password: null, created: false };
  }

  const password = generatePassword(12);
  const passwordHash = await bcrypt.hash(password, 12);

  const [created] = await db
    .insert(users)
    .values({ email, name: seed.name, role: seed.role, passwordHash })
    .returning();

  return { id: created.id, password, created: true };
}

async function main() {
  console.log("Seeding auth users...\n");

  const admin = await upsertUser({
    email: "oskarandreassen01@gmail.com",
    name: "Oskar Östlind",
    role: "admin",
  });

  const customer = await upsertUser({
    email: "jesper@jjbyggboden.se",
    name: "Jesper Johansson",
    role: "customer",
  });

  // ---------------------------------------------------------------------
  // Membership: link the customer to the "jjbygg" site.
  // ---------------------------------------------------------------------
  const [site] = await db
    .select()
    .from(sites)
    .where(eq(sites.slug, "jjbygg"))
    .limit(1);

  if (!site) {
    console.warn(
      'Varning: hittade ingen site med slug "jjbygg" — hoppar över membership. ' +
        "Kör seedningen som skapar siten (scripts/seed.ts) först.",
    );
  } else {
    const [existingMembership] = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, customer.id),
          eq(memberships.siteId, site.id),
        ),
      )
      .limit(1);

    if (existingMembership) {
      console.log(
        `Membership: jesper@jjbyggboden.se <-> jjbygg (${site.id}) fanns redan.`,
      );
    } else {
      await db
        .insert(memberships)
        .values({ userId: customer.id, siteId: site.id });
      console.log(
        `Membership: jesper@jjbyggboden.se <-> jjbygg (${site.id}) skapad.`,
      );
    }
  }

  console.log("\n=== SEED SUMMARY ===");
  console.log(
    `Admin:    ${admin.created ? "skapad" : "fanns redan"} — oskarandreassen01@gmail.com (${admin.id})`,
  );
  console.log(
    admin.password
      ? `  Lösenord: ${admin.password}`
      : "  Lösenord: oförändrat (användaren fanns redan, lösenordet roteras inte)",
  );
  console.log(
    `Customer: ${customer.created ? "skapad" : "fanns redan"} — jesper@jjbyggboden.se (${customer.id})`,
  );
  console.log(
    customer.password
      ? `  Lösenord: ${customer.password}`
      : "  Lösenord: oförändrat (användaren fanns redan, lösenordet roteras inte)",
  );
  console.log("=====================\n");
}

main()
  .then(() => {
    console.log("Seed completed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
