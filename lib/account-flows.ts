import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { memberships, sites, users, type MembershipRole } from "@/lib/db/schema";
import { createToken, TOKEN_TTL_HOURS, type TokenRow } from "@/lib/tokens";
import { sendMail } from "@/lib/mail";
import { inviteEmail, verifyEmail, resetEmail } from "@/lib/emails";
import { appUrl } from "@/lib/app-url";
import { logActivity } from "@/lib/audit";
import type { AuthUser } from "@/lib/guard";

/**
 * Delad logik för konton och inbjudningar. Medvetet INTE en "use server"-fil:
 * exporterade funktioner härifrån går inte att anropa direkt från klienten,
 * så de kan anta att anroparen (en server action) redan har kontrollerat
 * behörigheten.
 */

export const MIN_PASSWORD_LENGTH = 10;
export const BCRYPT_COST = 12;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_RE.test(email);
}

/** Lokaldelen av en adress ("anna" för anna@exempel.se) — standardnamn för nya konton. */
export function emailLocalPart(email: string): string {
  return email.split("@")[0] || email;
}

export function isMembershipRole(value: unknown): value is MembershipRole {
  return value === "owner" || value === "editor";
}

/**
 * Tillåter bara interna sökvägar som callbackUrl ("/admin/…", "/invite?…"),
 * aldrig "//annan-doman" eller absoluta URL:er.
 */
export function safeCallbackPath(value: unknown, fallback = "/admin"): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return fallback;
  }
  return trimmed;
}

/** Skickar mejl och loggar fel (samt länken i utveckling) utan att kasta. */
async function deliver(to: string, content: { subject: string; text: string; html: string }, link: string) {
  const result = await sendMail({ to, ...content });
  if (!result.ok) {
    console.error(`[mail] kunde inte skicka "${content.subject}" till ${to}: ${result.error}`);
    if (process.env.NODE_ENV !== "production") {
      console.info(`[mail] länk (endast i utveckling): ${link}`);
    }
  }
  return result.ok;
}

/** Skapar en ny verify-token och mejlar länken. Returnerar om mejlet gick iväg. */
export async function sendVerificationEmail(user: { id: string; email: string; name: string }): Promise<boolean> {
  const token = await createToken({ type: "verify", userId: user.id, email: user.email });
  const url = `${await appUrl()}/verify?token=${encodeURIComponent(token)}`;
  return deliver(user.email, verifyEmail({ name: user.name, url }), url);
}

/** Skapar en ny reset-token och mejlar länken. Returnerar om mejlet gick iväg. */
export async function sendPasswordResetEmail(user: { id: string; email: string; name: string }): Promise<boolean> {
  const token = await createToken({ type: "reset", userId: user.id, email: user.email });
  const url = `${await appUrl()}/reset?token=${encodeURIComponent(token)}`;
  return deliver(user.email, resetEmail({ name: user.name, url }), url);
}

export type InviteResult =
  | { ok: true; mailSent: boolean; email: string }
  | { ok: false; error: "invalid-email" | "already-member" | "site-not-found" };

/**
 * Bjuder in en adress till en sajt med en viss roll.
 *
 * - Saknas användaren skapas den (role customer, passwordHash null,
 *   namn = angivet namn eller e-postens lokaldel). Medlemskapet skapas
 *   först när inbjudan accepteras.
 * - Är adressen redan medlem på sajten avbryts inbjudan.
 * - En tidigare oanvänd inbjudan till samma sajt slutar gälla (createToken).
 */
export async function inviteToSite(input: {
  siteId: string;
  email: string;
  role: MembershipRole;
  inviter: AuthUser;
  name?: string;
}): Promise<InviteResult> {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) return { ok: false, error: "invalid-email" };

  const [site] = await db.select({ id: sites.id, name: sites.name }).from(sites).where(eq(sites.id, input.siteId)).limit(1);
  if (!site) return { ok: false, error: "site-not-found" };

  let [user] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (user) {
    const [membership] = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(and(eq(memberships.userId, user.id), eq(memberships.siteId, site.id)))
      .limit(1);
    if (membership) return { ok: false, error: "already-member" };
  } else {
    const name = input.name?.trim() || emailLocalPart(email);
    [user] = await db
      .insert(users)
      .values({ email, name, role: "customer", passwordHash: null, emailVerifiedAt: null, signupSource: "inbjudan" })
      .onConflictDoNothing()
      .returning({ id: users.id, email: users.email, name: users.name });
    if (!user) {
      // Någon annan skapade adressen samtidigt — läs den igen.
      [user] = await db
        .select({ id: users.id, email: users.email, name: users.name })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
    }
  }

  const mailSent = await sendInviteMail({
    userId: user.id,
    email,
    site,
    role: input.role,
    inviter: input.inviter,
  });

  await logActivity({
    userId: input.inviter.id,
    userEmail: input.inviter.email,
    siteId: site.id,
    action: "members.invite",
    detail: `Bjöd in ${email} som ${input.role === "owner" ? "ägare" : "redaktör"}${mailSent ? "" : " (mejlet kunde inte skickas)"}`,
  });

  return { ok: true, mailSent, email };
}

/** Skapar en ny invite-token (den gamla slutar gälla) och mejlar länken. */
export async function sendInviteMail(input: {
  userId: string;
  email: string;
  site: { id: string; name: string };
  role: MembershipRole;
  inviter: AuthUser;
}): Promise<boolean> {
  const token = await createToken({
    type: "invite",
    userId: input.userId,
    email: input.email,
    siteId: input.site.id,
    membershipRole: input.role,
    invitedByUserId: input.inviter.id,
  });
  const url = `${await appUrl()}/invite?token=${encodeURIComponent(token)}`;
  const content = inviteEmail({
    siteName: input.site.name,
    inviterName: input.inviter.name || input.inviter.email,
    role: input.role,
    url,
    expiresDays: Math.round(TOKEN_TTL_HOURS.invite / 24),
  });
  return deliver(input.email, content, url);
}

/**
 * Skapar (eller uppgraderar) medlemskapet från en accepterad inbjudan.
 * Ett befintligt ägarskap nedgraderas aldrig av en redaktörsinbjudan.
 */
export async function grantMembershipFromInvite(token: TokenRow): Promise<void> {
  if (!token.siteId) return;
  const role: MembershipRole = token.membershipRole ?? "editor";

  const [existing] = await db
    .select({ id: memberships.id, role: memberships.role })
    .from(memberships)
    .where(and(eq(memberships.userId, token.userId), eq(memberships.siteId, token.siteId)))
    .limit(1);

  if (!existing) {
    await db
      .insert(memberships)
      .values({ userId: token.userId, siteId: token.siteId, role })
      .onConflictDoNothing();
    return;
  }

  if (existing.role === "editor" && role === "owner") {
    await db
      .update(memberships)
      .set({ role: "owner", updatedAt: new Date() })
      .where(eq(memberships.id, existing.id));
  }
}
