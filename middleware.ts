import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

/**
 * Lightweight Auth.js instance for middleware. Built only from the
 * edge-safe authConfig (no database access), as required on the Edge
 * runtime. The full instance with the Credentials provider lives in
 * lib/auth.ts and is used everywhere else.
 */
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth?.user;
  const { pathname, search } = req.nextUrl;

  const isOnAdmin = pathname.startsWith("/admin");

  if (isOnAdmin && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return Response.redirect(loginUrl);
  }

  return undefined;
});

export const config = {
  matcher: ["/admin/:path*"],
};
