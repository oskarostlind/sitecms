"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { signIn } from "@/lib/auth";
import { consumeToken } from "@/lib/tokens";
import { sendMail } from "@/lib/mail";
import { accountExistsEmail } from "@/lib/emails";
import { appUrl } from "@/lib/app-url";
import { logActivity } from "@/lib/audit";
import {
  BCRYPT_COST,
  MIN_PASSWORD_LENGTH,
  isValidEmail,
  normalizeEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "@/lib/account-flows";

/**
 * Publika kontoflöden: skapa konto, skicka ny bekräftelse, glömt lösenord
 * och nytt lösenord via e-postlänk. Alla svar är generiska — ingen action
 * avslöjar om en adress har ett konto eller inte.
 */

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function query(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const q = search.toString();
  return q ? `?${q}` : "";
}

/**
 * /signup: skapar ett kundkonto (overifierat) och mejlar en bekräftelselänk.
 * Finns adressen redan visas exakt samma "kolla din mejl"-sida, men mejlet
 * säger i stället att kontot redan finns (eller är en ny bekräftelselänk om
 * kontot aldrig bekräftats).
 */
export async function signupAction(formData: FormData): Promise<void> {
  const name = readString(formData, "name").trim();
  const email = normalizeEmail(formData.get("email"));
  const password = readString(formData, "password");

  if (!name || !email || !password) {
    redirect(`/signup${query({ error: "missing", name, email })}`);
  }
  if (name.length > 120) {
    redirect(`/signup${query({ error: "name-long", email })}`);
  }
  if (!isValidEmail(email)) {
    redirect(`/signup${query({ error: "invalid-email", name, email })}`);
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    redirect(`/signup${query({ error: "short", name, email })}`);
  }

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (existing) {
    if (existing.passwordHash && !existing.emailVerifiedAt) {
      // Registrerade sig tidigare men bekräftade aldrig — skicka en ny länk.
      // Lösenordet skrivs medvetet inte över: då skulle vem som helst kunna
      // byta lösenord på någon annans pågående registrering.
      await sendVerificationEmail(existing);
    } else {
      // Bekräftat konto, eller inbjuden/Google-konto utan lösenord: berätta
      // för adressens ägare att kontot finns (de kan välja lösenord via /forgot).
      const base = await appUrl();
      const result = await sendMail({
        to: email,
        ...accountExistsEmail({ name: existing.name, loginUrl: `${base}/login`, forgotUrl: `${base}/forgot` }),
      });
      if (!result.ok) console.error(`[mail] konto-finns-mejl till ${email} misslyckades: ${result.error}`);
    }
    redirect(`/signup${query({ sent: "1", email })}`);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const [created] = await db
    .insert(users)
    .values({ name, email, passwordHash, role: "customer", emailVerifiedAt: null })
    .onConflictDoNothing()
    .returning();

  if (created) {
    await logActivity({
      userId: created.id,
      userEmail: created.email,
      siteId: null,
      action: "account.signup",
      detail: `Skapade kontot ${created.email}`,
    });
    await sendVerificationEmail(created);
  }

  redirect(`/signup${query({ sent: "1", email })}`);
}

/**
 * /verify: förbrukar verify-token, markerar e-posten som bekräftad och
 * skickar till inloggningen (/login?verified=1&email=…). Automatisk
 * inloggning görs inte — vi har inte lösenordet här, och en session utan
 * lösenord via Credentials skulle kräva en separat provider.
 */
export async function verifyEmailAction(formData: FormData): Promise<void> {
  const token = readString(formData, "token");
  const row = token ? await consumeToken(token, "verify") : null;
  if (!row) redirect("/verify?error=invalid");

  const [user] = await db.select().from(users).where(eq(users.id, row.userId)).limit(1);
  if (!user) redirect("/verify?error=invalid");

  if (!user.emailVerifiedAt) {
    await db
      .update(users)
      .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id));

    await logActivity({
      userId: user.id,
      userEmail: user.email,
      siteId: null,
      action: "account.verify",
      detail: `Bekräftade e-postadressen ${user.email}`,
    });
  }

  redirect(`/login${query({ verified: "1", email: user.email })}`);
}

/**
 * "Skicka ny bekräftelse" (från /login?error=unverified, /signup och /verify).
 * Skickar bara om kontot finns och inte är bekräftat, men svarar alltid likadant.
 * `returnTo` bestämmer vilken sida som visar kvittensen.
 */
export async function resendVerificationAction(formData: FormData): Promise<void> {
  const email = normalizeEmail(formData.get("email"));
  const returnTo = readString(formData, "returnTo");
  const target = returnTo === "signup" ? "/signup" : returnTo === "verify" ? "/verify" : "/login";

  if (!email || !isValidEmail(email)) {
    redirect(`${target}${query({ error: target === "/login" ? "unverified" : "invalid-email", resendError: "1" })}`);
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (user && !user.emailVerifiedAt && user.passwordHash) {
    await sendVerificationEmail(user);
  }

  if (target === "/signup") redirect(`/signup${query({ sent: "1", resent: "1", email })}`);
  if (target === "/verify") redirect(`/verify${query({ resent: "1" })}`);
  redirect(`/login${query({ resent: "1", email })}`);
}

/**
 * /forgot: mejlar en återställningslänk om kontot finns (även konton utan
 * lösenord — inbjudna och Google-konton kan välja ett lösenord den vägen).
 */
export async function forgotPasswordAction(formData: FormData): Promise<void> {
  const email = normalizeEmail(formData.get("email"));
  if (!email || !isValidEmail(email)) {
    redirect(`/forgot${query({ error: "invalid-email", email })}`);
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (user) {
    await sendPasswordResetEmail(user);
  }

  redirect(`/forgot${query({ sent: "1", email })}`);
}

/**
 * /reset: sätter nytt lösenord via reset-token och loggar in direkt.
 * Att länken öppnats bevisar att man äger adressen, så e-posten markeras
 * som bekräftad om den inte redan var det.
 */
export async function resetPasswordWithTokenAction(formData: FormData): Promise<void> {
  const token = readString(formData, "token");
  const password = readString(formData, "password");
  const confirm = readString(formData, "confirmPassword");

  if (!token) redirect("/reset?error=invalid");
  if (!password || !confirm) redirect(`/reset${query({ token, error: "missing" })}`);
  if (password.length < MIN_PASSWORD_LENGTH) redirect(`/reset${query({ token, error: "short" })}`);
  if (password !== confirm) redirect(`/reset${query({ token, error: "mismatch" })}`);

  const row = await consumeToken(token, "reset");
  if (!row) redirect("/reset?error=invalid");

  const [user] = await db.select().from(users).where(eq(users.id, row.userId)).limit(1);
  if (!user) redirect("/reset?error=invalid");

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  await db
    .update(users)
    .set({ passwordHash, emailVerifiedAt: user.emailVerifiedAt ?? new Date(), updatedAt: new Date() })
    .where(eq(users.id, user.id));

  await logActivity({
    userId: user.id,
    userEmail: user.email,
    siteId: null,
    action: "account.password_reset",
    detail: "Valde ett nytt lösenord via e-postlänk",
  });

  try {
    await signIn("credentials", { email: user.email, password, redirectTo: "/admin" });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/login${query({ reset: "1", email: user.email })}`);
    }
    throw error;
  }
}
