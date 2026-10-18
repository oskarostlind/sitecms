import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { authConfig } from "../auth.config";
import { db } from "./db";
import { users } from "./db/schema";
import { logActivity } from "./audit";

/**
 * Full Auth.js instance, including the Credentials provider and (when
 * configured) the Google provider.
 *
 * This file imports the database and bcryptjs, so it must only be used from
 * Node.js runtime code (Route Handlers, Server Actions, Server Components) —
 * never from middleware.ts (use auth.config.ts + a lightweight NextAuth
 * instance there instead).
 */

/**
 * Google sign-in is only offered when both env vars are configured. Used
 * both to conditionally register the provider below and to decide whether
 * the login page should render the "Logga in med Google" button.
 */
export const googleAuthEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

/**
 * Kastas av authorize() när lösenordet stämmer men e-postadressen inte är
 * bekräftad ännu. loginAction (lib/auth-actions.ts) känner igen koden och
 * skickar till /login?error=unverified. Eftersom den bara kastas efter ett
 * korrekt lösenord avslöjar den inget om vilka adresser som finns.
 */
export class UnverifiedEmailError extends CredentialsSignin {
  code = "unverified";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-post", type: "email" },
        password: { label: "Lösenord", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;

        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const normalizedEmail = email.trim().toLowerCase();

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, normalizedEmail))
          .limit(1);

        if (!user || !user.passwordHash) {
          // Unknown address, or an account that hasn't chosen a password yet
          // (pending invite / Google-only).
          return null;
        }

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) {
          return null;
        }

        if (!user.emailVerifiedAt) {
          throw new UnverifiedEmailError();
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
    ...(googleAuthEnabled
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    ...authConfig.callbacks,
    /**
     * Google-inloggning: okända adresser får ett konto automatiskt (role
     * customer, inget lösenord, e-posten räknas som bekräftad eftersom Google
     * har bekräftat den). Befintliga konton markeras som bekräftade om de inte
     * redan var det — t.ex. någon som fått en inbjudan men loggar in med
     * Google i stället. Credentials-inloggning går via authorize() ovan.
     */
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") {
        return true;
      }

      const email = user.email?.trim().toLowerCase();
      if (!email) {
        return false;
      }
      // Google skickar email_verified; en obekräftad Google-adress släpps inte in.
      if (profile && (profile as { email_verified?: boolean }).email_verified === false) {
        return false;
      }

      const [dbUser] = await db
        .select({ id: users.id, emailVerifiedAt: users.emailVerifiedAt })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (dbUser) {
        if (!dbUser.emailVerifiedAt) {
          // Ett lösenord som satts på ett obekräftat konto har aldrig bevisats
          // av adressens ägare (vem som helst kan registrera en adress), så det
          // nollställs när Google bekräftar adressen. Ägaren kan välja ett nytt
          // under Mitt konto eller via "Glömt lösenord?".
          await db
            .update(users)
            .set({ emailVerifiedAt: new Date(), passwordHash: null, updatedAt: new Date() })
            .where(eq(users.id, dbUser.id));
        }
        return true;
      }

      const name = user.name?.trim() || email.split("@")[0] || email;
      const [created] = await db
        .insert(users)
        .values({ email, name, role: "customer", passwordHash: null, emailVerifiedAt: new Date() })
        .onConflictDoNothing()
        .returning({ id: users.id, email: users.email });

      if (created) {
        await logActivity({
          userId: created.id,
          userEmail: created.email,
          siteId: null,
          action: "account.signup",
          detail: `Skapade kontot ${created.email} med Google`,
        });
      }

      return true;
    },
    /**
     * Overrides the edge-safe jwt callback from authConfig so Google
     * sign-ins get the same token.id/token.role as credentials sign-ins.
     * Google's OAuth profile has no role, so it's looked up from the
     * database (by lowercased email) on initial sign-in. signIn() above runs
     * first, so accounts it just created are found here too.
     */
    async jwt({ token, user, account }) {
      if (user && account?.provider === "google") {
        const email = user.email?.trim().toLowerCase();
        if (email) {
          const [dbUser] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.name = dbUser.name;
            token.email = dbUser.email;
            return token;
          }
        }
        // Utan databasrad finns inget id att knyta sessionen till — släpp
        // inte igenom en token som skulle se inloggad ut men sakna id.
        throw new Error("Google-kontot saknas i databasen efter inloggning");
      }

      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: "admin" | "customer" }).role;
        token.name = user.name;
        token.email = user.email;
      }

      return token;
    },
  },
});
