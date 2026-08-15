import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "./auth";
import { db } from "./db";
import { memberships, sites } from "./db/schema";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "customer";
};

export type Site = typeof sites.$inferSelect;

/**
 * Reads the current session and returns the authenticated user, or redirects
 * to /login if there is none. Other modules should treat this as the single
 * source of truth for "am I logged in" server-side.
 */
export async function requireUser(): Promise<AuthUser> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    role: session.user.role,
  };
}

/**
 * Requires a logged-in user AND that the user has access to the given site.
 * Admins have access to every site. Customers need a row in `memberships`
 * linking them to that site; otherwise they're redirected back to /admin
 * with an error flag.
 */
export async function requireSiteAccess(siteId: string): Promise<AuthUser> {
  const user = await requireUser();

  if (user.role === "admin") {
    return user;
  }

  const [membership] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.userId, user.id), eq(memberships.siteId, siteId)))
    .limit(1);

  if (!membership) {
    redirect("/admin?error=forbidden");
  }

  return user;
}

/**
 * Returns the sites a user is allowed to manage: every site for admins,
 * only sites they have a membership for otherwise.
 */
export async function getUserSites(user: AuthUser): Promise<Site[]> {
  if (user.role === "admin") {
    return db.select().from(sites);
  }

  const rows = await db
    .select({ site: sites })
    .from(memberships)
    .innerJoin(sites, eq(memberships.siteId, sites.id))
    .where(eq(memberships.userId, user.id));

  return rows.map((row) => row.site);
}
