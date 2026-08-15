"use server";

import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { memberships, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { logActivity } from "@/lib/audit";

const BCRYPT_COST = 12;
const TEMP_PASSWORD_LENGTH = 14;

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Generates a random temporary password: 14 characters drawn from a charset
 * that mixes upper/lowercase letters, digits and symbols, avoiding visually
 * ambiguous characters (0/O, 1/l/I) — same approach as
 * scripts/seed-users.ts's generatePassword, just an admin-facing length.
 */
function generateTempPassword(length = TEMP_PASSWORD_LENGTH): string {
  const charset =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset[randomInt(charset.length)];
  }
  return password;
}

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, value);
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

/**
 * Creates a customer user, hashes a freshly generated temporary password,
 * and links them to one or more sites via memberships. The temp password is
 * shown exactly once, via the redirect query string (same "show once"
 * pattern used for API keys in lib/actions/sites.ts) — it is never stored
 * anywhere other than as a bcrypt hash.
 */
export async function createCustomerUser(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const name = readString(formData, "name");
  const emailInput = readString(formData, "email");
  const email = emailInput.toLowerCase();
  const siteIds = formData.getAll("siteIds").filter((v): v is string => typeof v === "string" && v !== "");

  if (!name || !email) {
    redirect("/admin/anvandare?error=missing");
  }

  if (siteIds.length === 0) {
    redirect("/admin/anvandare?error=no-site");
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    redirect("/admin/anvandare?error=email-taken");
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_COST);

  const [created] = await db
    .insert(users)
    .values({ name, email, passwordHash, role: "customer" })
    .returning();

  for (const siteId of siteIds) {
    await db.insert(memberships).values({ userId: created.id, siteId });
  }

  await logActivity({
    userId: admin.id,
    userEmail: admin.email,
    siteId: null,
    action: "users.create",
    detail: `Skapade kundanvändaren "${name}" (${email}) med ${siteIds.length} sajt(er)`,
  });

  revalidatePath("/admin/anvandare");

  redirect(
    `/admin/anvandare${buildQuery({
      createdUser: name,
      createdEmail: email,
      tempPassword,
    })}`,
  );
}

/**
 * Deletes a user. Refuses to delete yourself (you'd lock yourself out of the
 * confirming session) and refuses to delete the last remaining admin (the
 * panel would become unmanageable). Memberships cascade-delete via the FK
 * in lib/db/schema.ts, so no manual cleanup is needed there.
 */
export async function deleteUserAction(userId: string): Promise<void> {
  const admin = await requireAdmin();

  if (userId === admin.id) {
    redirect("/admin/anvandare?error=self-delete");
  }

  const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!target) {
    redirect("/admin/anvandare?error=not-found");
  }

  if (target.role === "admin") {
    const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
    if (admins.length <= 1) {
      redirect("/admin/anvandare?error=last-admin");
    }
  }

  await db.delete(users).where(eq(users.id, userId));

  await logActivity({
    userId: admin.id,
    userEmail: admin.email,
    siteId: null,
    action: "users.delete",
    detail: `Tog bort användaren "${target.name}" (${target.email})`,
  });

  revalidatePath("/admin/anvandare");

  redirect("/admin/anvandare?deleted=1");
}

/**
 * Resets a user's password to a new random temporary one, shown exactly
 * once via the redirect query string, matching createCustomerUser.
 */
export async function resetPasswordAction(userId: string): Promise<void> {
  const admin = await requireAdmin();

  const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!target) {
    redirect("/admin/anvandare?error=not-found");
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_COST);

  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await logActivity({
    userId: admin.id,
    userEmail: admin.email,
    siteId: null,
    action: "users.password_reset",
    detail: `Återställde lösenordet för "${target.name}" (${target.email})`,
  });

  redirect(
    `/admin/anvandare${buildQuery({
      resetUser: target.name,
      resetEmail: target.email,
      tempPassword,
    })}`,
  );
}
