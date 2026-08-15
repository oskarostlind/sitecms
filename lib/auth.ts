import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { authConfig } from "../auth.config";
import { db } from "./db";
import { users } from "./db/schema";

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

        if (!user) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) {
          return null;
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
     * Gate for the Google provider: no self-registration. A Google account
     * is only allowed to sign in if a user with the same (lowercased) email
     * already exists in the database — its existing role/memberships are
     * then used as-is. Credentials sign-in already goes through authorize()
     * above, so it isn't affected by this check.
     */
    async signIn({ user, account }) {
      if (account?.provider !== "google") {
        return true;
      }

      const email = user.email?.trim().toLowerCase();
      if (!email) {
        return false;
      }

      const [dbUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      return Boolean(dbUser);
    },
    /**
     * Overrides the edge-safe jwt callback from authConfig so Google
     * sign-ins get the same token.id/token.role as credentials sign-ins.
     * Google's OAuth profile has no role, so it's looked up from the
     * database (by lowercased email) on initial sign-in.
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
          }
        }
        return token;
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
