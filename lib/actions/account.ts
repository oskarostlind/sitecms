"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, users } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { logActivity } from "@/lib/audit";

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

  const currentMatches = await bcrypt.compare(currentPassword, dbUser.passwordHash);
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
