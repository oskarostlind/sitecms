import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";
import {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_MAX_AGE,
  computeAttribution,
  encodeAttribution,
} from "./lib/attribution";

/**
 * Lightweight Auth.js instance for middleware. Built only from the
 * edge-safe authConfig (no database access), as required on the Edge
 * runtime. The full instance with the Credentials provider lives in
 * lib/auth.ts and is used everywhere else.
 */
const { auth } = NextAuth(authConfig);

/** Egna värdar: interna referers ger aldrig en ny källa. */
const OWN_HOSTS = ["sitecms.se", "sitecms-zeta.vercel.app", "vercel.app", "localhost"];

export default auth((req) => {
  const isLoggedIn = !!req.auth?.user;
  const { pathname, search } = req.nextUrl;

  const isOnAdmin = pathname.startsWith("/admin");

  if (isOnAdmin && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return Response.redirect(loginUrl);
  }

  // First-touch: sätt källan en gång, på första publika sidvisningen.
  if (!isOnAdmin && !req.cookies.has(ATTRIBUTION_COOKIE)) {
    const attribution = computeAttribution({
      url: req.nextUrl,
      referer: req.headers.get("referer"),
      ownHosts: OWN_HOSTS,
    });
    if (attribution) {
      const res = NextResponse.next();
      res.cookies.set(ATTRIBUTION_COOKIE, encodeAttribution(attribution), {
        maxAge: ATTRIBUTION_MAX_AGE,
        httpOnly: true,
        sameSite: "lax",
        secure: req.nextUrl.protocol === "https:",
        path: "/",
      });
      return res;
    }
  }

  return undefined;
});

export const config = {
  // /admin för inloggningsskyddet + publika sidor för källmätningen.
  // Undantar API, Next-interna filer och statiska filer (allt med filändelse).
  matcher: ["/admin/:path*", "/((?!api|_next|admin|.*\\..*).*)"],
};
