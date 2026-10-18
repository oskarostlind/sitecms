"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { authTokens, memberships, sites, users, type MembershipRole } from "@/lib/db/schema";
import { requireSiteOwner, requireUser } from "@/lib/guard";
import { auth, signIn, signOut } from "@/lib/auth";
import { consumeToken, peekToken, type TokenRow } from "@/lib/tokens";
import { logActivity } from "@/lib/audit";
import {
  BCRYPT_COST,
  MIN_PASSWORD_LENGTH,
  grantMembershipFromInvite,
  inviteToSite,
  isMembershipRole,
  normalizeEmail,
  sendInviteMail,
} from "@/lib/account-flows";

/**
 * Medlemmar per sajt (/admin/sites/[siteId]/medlemmar) och att acceptera
 * inbjudningar (/invite?token=…).
 *
 * Regler (docs/SELF-SERVICE.md, avsnitt A):
 * - Medlemskapet skapas först när inbjudan accepteras.
 * - Sista ägaren kan inte tas bort eller göras till redaktör.
 * - Man kan inte bjuda in någon som redan är medlem.
 */

const ROLE_WORD: Record<MembershipRole, string> = { owner: "ägare", editor: "redaktör" };

function membersUrl(siteId: string, params: Record<string, string | undefined> = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const q = search.toString();
  return `/admin/sites/${siteId}/medlemmar${q ? `?${q}` : ""}`;
}

function inviteUrl(token: string, params: Record<string, string | undefined> = {}): string {
  const search = new URLSearchParams({ token });
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  return `/invite?${search.toString()}`;
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

async function ownerCount(siteId: string): Promise<number> {
  const rows = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.siteId, siteId), eq(memberships.role, "owner")));
  return rows.length;
}

/** Väntande (oanvänd, ej utgången) inbjudan med id på sajten, eller null. */
async function findPendingInvite(siteId: string, tokenId: string) {
  const [row] = await db
    .select()
    .from(authTokens)
    .where(
      and(
        eq(authTokens.id, tokenId),
        eq(authTokens.type, "invite"),
        eq(authTokens.siteId, siteId),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return row ?? null;
}

// ---------------------------------------------------------------------------
// Ägarens åtgärder på medlemssidan
// ---------------------------------------------------------------------------

/** Bjud in (e-post + roll). formData: email, role ("owner" | "editor"). */
export async function inviteMember(siteId: string, formData: FormData): Promise<void> {
  const user = await requireSiteOwner(siteId);
  const email = normalizeEmail(formData.get("email"));
  const role = formData.get("role");

  if (!email) redirect(membersUrl(siteId, { error: "missing" }));
  if (!isMembershipRole(role)) redirect(membersUrl(siteId, { error: "invalid-role", email }));

  const result = await inviteToSite({ siteId, email, role, inviter: user });
  if (!result.ok) {
    redirect(membersUrl(siteId, { error: result.error, email }));
  }

  revalidatePath(membersUrl(siteId));
  redirect(membersUrl(siteId, { invited: result.email, mailFailed: result.mailSent ? undefined : "1" }));
}

/** Skicka om en väntande inbjudan (ny länk, den gamla slutar gälla, ny giltighetstid). */
export async function resendInvite(siteId: string, tokenId: string): Promise<void> {
  const user = await requireSiteOwner(siteId);
  const invite = await findPendingInvite(siteId, tokenId);
  if (!invite) redirect(membersUrl(siteId, { error: "invite-not-found" }));

  const [site] = await db.select({ id: sites.id, name: sites.name }).from(sites).where(eq(sites.id, siteId)).limit(1);
  if (!site) redirect("/admin?error=forbidden");

  const role: MembershipRole = invite.membershipRole ?? "editor";
  const mailSent = await sendInviteMail({ userId: invite.userId, email: invite.email, site, role, inviter: user });

  await logActivity({
    userId: user.id,
    userEmail: user.email,
    siteId,
    action: "members.invite_resend",
    detail: `Skickade om inbjudan till ${invite.email} (${ROLE_WORD[role]})${mailSent ? "" : " — mejlet kunde inte skickas"}`,
  });

  revalidatePath(membersUrl(siteId));
  redirect(membersUrl(siteId, { resent: invite.email, mailFailed: mailSent ? undefined : "1" }));
}

/** Återkalla en väntande inbjudan (usedAt = now — länken slutar fungera). */
export async function revokeInvite(siteId: string, tokenId: string): Promise<void> {
  const user = await requireSiteOwner(siteId);
  const invite = await findPendingInvite(siteId, tokenId);
  if (!invite) redirect(membersUrl(siteId, { error: "invite-not-found" }));

  await db.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, invite.id));

  await logActivity({
    userId: user.id,
    userEmail: user.email,
    siteId,
    action: "members.invite_revoke",
    detail: `Återkallade inbjudan till ${invite.email}`,
  });

  revalidatePath(membersUrl(siteId));
  redirect(membersUrl(siteId, { revoked: "1" }));
}

/** Ändra en medlems roll. formData: role ("owner" | "editor"). */
export async function changeMemberRole(siteId: string, membershipId: string, formData: FormData): Promise<void> {
  const user = await requireSiteOwner(siteId);
  const role = formData.get("role");
  if (!isMembershipRole(role)) redirect(membersUrl(siteId, { error: "invalid-role" }));

  const [member] = await db
    .select({ id: memberships.id, role: memberships.role, userId: memberships.userId, email: users.email, name: users.name })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(and(eq(memberships.id, membershipId), eq(memberships.siteId, siteId)))
    .limit(1);
  if (!member) redirect(membersUrl(siteId, { error: "member-not-found" }));

  if (member.role === role) redirect(membersUrl(siteId));

  if (member.role === "owner" && role === "editor" && (await ownerCount(siteId)) <= 1) {
    redirect(membersUrl(siteId, { error: "last-owner" }));
  }

  await db
    .update(memberships)
    .set({ role, updatedAt: new Date() })
    .where(eq(memberships.id, member.id));

  await logActivity({
    userId: user.id,
    userEmail: user.email,
    siteId,
    action: "members.role_change",
    detail: `Ändrade rollen för ${member.name} (${member.email}) från ${ROLE_WORD[member.role]} till ${ROLE_WORD[role]}`,
  });

  revalidatePath("/admin", "layout");

  // Gjorde man sig själv till redaktör har man inte längre åtkomst till sidan.
  if (member.userId === user.id && role === "editor" && user.role !== "admin") {
    redirect(`/admin/sites/${siteId}`);
  }
  redirect(membersUrl(siteId, { roleChanged: "1" }));
}

/** Ta bort en medlem från sajten (kontot finns kvar). */
export async function removeMember(siteId: string, membershipId: string): Promise<void> {
  const user = await requireSiteOwner(siteId);

  const [member] = await db
    .select({ id: memberships.id, role: memberships.role, userId: memberships.userId, email: users.email, name: users.name })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(and(eq(memberships.id, membershipId), eq(memberships.siteId, siteId)))
    .limit(1);
  if (!member) redirect(membersUrl(siteId, { error: "member-not-found" }));

  if (member.role === "owner" && (await ownerCount(siteId)) <= 1) {
    redirect(membersUrl(siteId, { error: "last-owner" }));
  }

  await db.delete(memberships).where(eq(memberships.id, member.id));

  await logActivity({
    userId: user.id,
    userEmail: user.email,
    siteId,
    action: "members.remove",
    detail:
      member.userId === user.id
        ? `Lämnade sajten (var ${ROLE_WORD[member.role]})`
        : `Tog bort ${member.name} (${member.email}) som ${ROLE_WORD[member.role]}`,
  });

  revalidatePath("/admin", "layout");

  if (member.userId === user.id && user.role !== "admin") {
    redirect("/admin?list=1");
  }
  redirect(membersUrl(siteId, { removed: "1" }));
}

// ---------------------------------------------------------------------------
// Acceptera inbjudan (/invite?token=…)
// ---------------------------------------------------------------------------

async function finishAccept(
  token: TokenRow,
  acceptedBy: { id: string; email: string },
): Promise<string> {
  await grantMembershipFromInvite(token);

  await logActivity({
    userId: acceptedBy.id,
    userEmail: acceptedBy.email,
    siteId: token.siteId,
    action: "members.accept",
    detail: `Accepterade inbjudan som ${ROLE_WORD[token.membershipRole ?? "editor"]}`,
  });

  revalidatePath("/admin", "layout");
  return `/admin/sites/${token.siteId}`;
}

/**
 * Accept för konto utan lösenord (nyinbjuden): formData token, name, password.
 * Sätter namn + lösenord + emailVerifiedAt, skapar medlemskapet, förbrukar
 * token och loggar in med det nyss valda lösenordet.
 */
export async function acceptInviteWithPasswordAction(formData: FormData): Promise<void> {
  const token = readString(formData, "token");
  const name = readString(formData, "name").trim();
  const password = readString(formData, "password");

  if (!token) redirect("/invite?error=invalid");
  if (!name || !password) redirect(inviteUrl(token, { error: "missing" }));
  if (name.length > 120) redirect(inviteUrl(token, { error: "name-long" }));
  if (password.length < MIN_PASSWORD_LENGTH) redirect(inviteUrl(token, { error: "short" }));

  const peeked = await peekToken(token, "invite");
  if (!peeked || !peeked.siteId) redirect("/invite?error=invalid");

  const [user] = await db.select().from(users).where(eq(users.id, peeked.userId)).limit(1);
  if (!user) redirect("/invite?error=invalid");
  // Ett bekräftat konto med lösenord loggar in i stället. Ett obekräftat
  // lösenord (registrerad men aldrig bekräftad) har aldrig bevisats av
  // adressens ägare — inbjudningslänken gör det, så det får ersättas här.
  if (user.passwordHash && user.emailVerifiedAt) redirect(inviteUrl(token));

  const row = await consumeToken(token, "invite");
  if (!row || !row.siteId) redirect("/invite?error=invalid");

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  await db
    .update(users)
    .set({ name, passwordHash, emailVerifiedAt: user.emailVerifiedAt ?? new Date(), updatedAt: new Date() })
    .where(eq(users.id, user.id));

  const destination = await finishAccept(row, user);

  try {
    await signIn("credentials", { email: user.email, password, redirectTo: destination });
  } catch (error) {
    if (error instanceof AuthError) {
      // Medlemskapet är skapat; kunde vi inte logga in direkt får man göra det själv.
      redirect(`/login?callbackUrl=${encodeURIComponent(destination)}&email=${encodeURIComponent(user.email)}`);
    }
    throw error;
  }
}

/**
 * Accept för inloggad användare: formData token. Kräver att man är inloggad
 * som adressen inbjudan skickades till.
 */
export async function acceptInviteAction(formData: FormData): Promise<void> {
  const token = readString(formData, "token");
  if (!token) redirect("/invite?error=invalid");

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(inviteUrl(token))}`);
  }
  const user = await requireUser();

  const peeked = await peekToken(token, "invite");
  if (!peeked || !peeked.siteId) redirect("/invite?error=invalid");

  // Adresserna är unika, så rätt konto = samma användarrad som inbjudan gäller.
  if (peeked.userId !== user.id) {
    redirect(inviteUrl(token, { error: "wrong-account" }));
  }

  const row = await consumeToken(token, "invite");
  if (!row || !row.siteId) redirect("/invite?error=invalid");

  await db
    .update(users)
    .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(users.id, row.userId), isNull(users.emailVerifiedAt)));

  redirect(await finishAccept(row, user));
}

/** "Logga ut och byt konto" på /invite — loggar ut och tillbaka till inloggningen för inbjudan. */
export async function switchAccountForInviteAction(formData: FormData): Promise<void> {
  const token = readString(formData, "token");
  const callback = token ? inviteUrl(token) : "/admin";
  await signOut({ redirectTo: `/login?callbackUrl=${encodeURIComponent(callback)}` });
}
