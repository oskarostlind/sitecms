import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config.
 *
 * This file MUST NOT import anything that touches the database (lib/db) or
 * Node-only APIs, because it is imported directly by middleware.ts, which
 * runs on the Edge runtime. The Credentials provider (which needs db +
 * bcryptjs) is added separately in lib/auth.ts, which is only used from
 * Node.js runtime code (route handlers, server actions, RSC).
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: "admin" | "customer" }).role;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "admin" | "customer";
        session.user.name = (token.name as string) ?? session.user.name;
        session.user.email = (token.email as string) ?? session.user.email;
      }
      return session;
    },
  },
};
