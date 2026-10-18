"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { logActivity } from "@/lib/audit";
import {
  inviteToSite,
  isMembershipRole,
  isValidEmail,
  normalizeEmail,
  sendPasswordResetEmail,
} from "@/lib/account-flows";

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, value);
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

/**
 * "Bjud in användare" på /admin/anvandare: skickar en inbjudan per vald sajt
 * via samma logik som medlemssidan (lib/account-flows.ts → inviteToSite).
 * Kontot skapas utan lösenord om adressen är ny; personen väljer lösenord
 * själv när hen accepterar. Sajter där adressen redan är medlem hoppas över.
 *
 * formData: name (valfritt), email, siteIds (en eller flera), role ("owner" | "editor").
 */
export async function inviteUserAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const nameValue = formData.get("name");
  const name = typeof nameValue === "string" ? nameValue.trim() : "";
  const email = normalizeEmail(formData.get("email"));
  const role = formData.get("role");
  const siteIds = formData.getAll("siteIds").filter((v): v is string => typeof v === "string" && v !== "");

  if (!email) redirect("/admin/anvandare?error=missing");
  if (!isValidEmail(email)) redirect("/admin/anvandare?error=invalid-email");
  if (siteIds.length === 0) redirect("/admin/anvandare?error=no-site");
  if (!isMembershipRole(role)) redirect("/admin/anvandare?error=invalid-role");

  let invited = 0;
  let alreadyMember = 0;
  let mailFailed = 0;

  for (const siteId of siteIds) {
    const result = await inviteToSite({ siteId, email, role, inviter: admin, name });
    if (result.ok) {
      invited++;
      if (!result.mailSent) mailFailed++;
    } else if (result.error === "already-member") {
      alreadyMember++;
    }
  }

  revalidatePath("/admin/anvandare");

  if (invited === 0) {
    redirect(`/admin/anvandare${buildQuery({ error: alreadyMember > 0 ? "already-member" : "invite-failed" })}`);
  }

  redirect(
    `/admin/anvandare${buildQuery({
      invited: email,
      invitedCount: String(invited),
      skipped: alreadyMember > 0 ? String(alreadyMember) : undefined,
      mailFailed: mailFailed > 0 ? String(mailFailed) : undefined,
    })}`,
  );
}

/**
 * Deletes a user. Refuses to delete yourself (you'd lock yourself out of the
 * confirming session) and refuses to delete the last remaining admin (the
 * panel would become unmanageable). Memberships and auth tokens
 * cascade-delete via the FKs in lib/db/schema.ts.
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
 * Skickar ett mejl med en länk där användaren själv väljer nytt lösenord
 * (samma flöde som "Glömt lösenord?"). Det nuvarande lösenordet fortsätter
 * att fungera tills länken används — admin ser aldrig något lösenord.
 */
export async function resetPasswordAction(userId: string): Promise<void> {
  const admin = await requireAdmin();

  const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!target) {
    redirect("/admin/anvandare?error=not-found");
  }

  const mailSent = await sendPasswordResetEmail(target);

  await logActivity({
    userId: admin.id,
    userEmail: admin.email,
    siteId: null,
    action: "users.password_reset",
    detail: mailSent
      ? `Skickade en länk för nytt lösenord till "${target.name}" (${target.email})`
      : `Försökte skicka en länk för nytt lösenord till "${target.name}" (${target.email}) — mejlet kunde inte skickas`,
  });

  if (!mailSent) {
    redirect("/admin/anvandare?error=mail-failed");
  }

  redirect(`/admin/anvandare${buildQuery({ resetSent: target.email })}`);
}
