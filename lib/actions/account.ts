"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db, memberships, users } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { logActivity } from "@/lib/audit";
import { signOut } from "@/lib/auth";

const MIN_PASSWORD_LENGTH = 10;

/**
 * Server action backing the "Mitt konto" password change form. Verifies the
 * current password with bcrypt (same scheme as the Credentials provider in
 * lib/auth.ts) before allowing the change. Redirects back to /admin/konto
 * with a ?error= or ?success= query param so the server-rendered page can
 * show feedback, matching the pattern used by /login and /admin.
 */
export async function changePasswordAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const currentPassword = formData.get("currentPassword");
  const newPassword = formData.get("newPassword");
  const confirmPassword = formData.get("confirmPassword");

  if (
    typeof currentPassword !== "string" ||
    typeof newPassword !== "string" ||
    typeof confirmPassword !== "string" ||
    currentPassword === "" ||
    newPassword === "" ||
    confirmPassword === ""
  ) {
    redirect("/admin/konto?error=missing");
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    redirect("/admin/konto?error=short");
  }

  if (newPassword !== confirmPassword) {
    redirect("/admin/konto?error=mismatch");
  }

  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

  if (!dbUser) {
    redirect("/admin/konto?error=unknown");
  }

  // Google-only accounts have no password yet: any "current password" is
  // accepted so they can set one from the account page.
  const currentMatches = dbUser.passwordHash
    ? await bcrypt.compare(currentPassword, dbUser.passwordHash)
    : true;
  if (!currentMatches) {
    redirect("/admin/konto?error=wrong-current");
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 12);

  await db
    .update(users)
    .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  await logActivity({
    userId: user.id,
    userEmail: user.email,
    siteId: null,
    action: "account.password_change",
    detail: "Bytte lösenord",
  });

  redirect("/admin/konto?success=1");
}

/**
 * Closes the signed-in user's own account. Refused while the user is the
 * last owner of any site (the site would become unmanageable) and for the
 * last admin. Memberships and e-mail tokens cascade; sites the user created
 * stay with their remaining owners. Ends the session afterwards.
 */
export async function closeAccountAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const confirm = formData.get("confirmEmail");
  if (typeof confirm !== "string" || confirm.trim().toLowerCase() !== user.email.toLowerCase()) {
    redirect("/admin/konto?error=confirm-email");
  }

  if (user.role === "admin") {
    const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
    if (admins.length <= 1) {
      redirect("/admin/konto?error=last-admin");
    }
  }

  // Sites where this user is the only owner must get another owner (or be
  // removed) first — otherwise nobody could manage them afterwards.
  const owned = await db
    .select({ siteId: memberships.siteId })
    .from(memberships)
    .where(and(eq(memberships.userId, user.id), eq(memberships.role, "owner")));
  for (const row of owned) {
    const owners = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(and(eq(memberships.siteId, row.siteId), eq(memberships.role, "owner")));
    if (owners.length <= 1) {
      redirect("/admin/konto?error=last-owner");
    }
  }

  await logActivity({
    userId: user.id,
    userEmail: user.email,
    siteId: null,
    action: "account.delete",
    detail: `Avslutade sitt konto (${user.email})`,
  });

  await db.delete(users).where(eq(users.id, user.id));

  await signOut({ redirectTo: "/login?closed=1" });
}
