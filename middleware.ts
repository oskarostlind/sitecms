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

/**
 * Kanonisk värd: när CANONICAL_HOST är satt (t.ex. "sitecms.se") skickas
 * produktionsbesök på *.vercel.app dit med 308. Gäller bara sidor — /api
 * matchas inte av middleware, så kundsajter som anropar API:t via den gamla
 * adressen fortsätter fungera. Förhandsgranskningar (VERCEL_ENV=preview) rörs inte.
 */
function canonicalRedirect(url: URL): Response | null {
  const canonical = process.env.CANONICAL_HOST?.trim();
  if (!canonical || process.env.VERCEL_ENV !== "production") return null;
  if (url.hostname === canonical || !url.hostname.endsWith(".vercel.app")) return null;
  const target = new URL(`${url.pathname}${url.search}`, `https://${canonical}`);
  return Response.redirect(target, 308);
}

/**
 * Query-parametrar som tidigare bar hemligheter (API-nycklar och
 * revalidate-hemligheter) i adminpanelen. Hemligheterna lämnas numera över
 * via en krypterad engångscookie, men gamla bokmärken eller historikposter
 * kan fortfarande innehålla dem — de skalas bort innan något annat händer, så
 * att de inte hamnar i callbackUrl, Referer eller fler loggrader.
 */
const LEGACY_SECRET_PARAMS = ["key", "newKey", "newKeyName", "newSecret"];

function stripLegacySecrets(url: URL): Response | null {
  if (!url.pathname.startsWith("/admin")) return null;
  if (!LEGACY_SECRET_PARAMS.some((p) => url.searchParams.has(p))) return null;
  const clean = new URL(url);
  for (const p of LEGACY_SECRET_PARAMS) clean.searchParams.delete(p);
  const res = NextResponse.redirect(clean, 303);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}

export default auth((req) => {
  const stripped = stripLegacySecrets(req.nextUrl);
  if (stripped) return stripped;

  const redirectToCanonical = canonicalRedirect(req.nextUrl);
  if (redirectToCanonical) return redirectToCanonical;

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
