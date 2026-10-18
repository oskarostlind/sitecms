import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "./auth";
import { db } from "./db";
import { memberships, sites, type MembershipRole } from "./db/schema";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "customer";
};

export type Site = typeof sites.$inferSelect;

/** What the current user may do on one site. Admins are "owner" everywhere. */
export type SiteRole = MembershipRole;

export type SiteAccess = {
  user: AuthUser;
  siteRole: SiteRole;
  /** true for admins and site owners — may manage settings, members, structure, integration. */
  isOwner: boolean;
};

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
 * Resolves the user's role on a site without redirecting: 'owner' for admins
 * and owner-members, 'editor' for editor-members, null for no access.
 */
export async function getSiteRole(user: AuthUser, siteId: string): Promise<SiteRole | null> {
  if (user.role === "admin") {
    return "owner";
  }

  const [membership] = await db
    .select({ role: memberships.role })
    .from(memberships)
    .where(and(eq(memberships.userId, user.id), eq(memberships.siteId, siteId)))
    .limit(1);

  return membership?.role ?? null;
}

/**
 * Requires a logged-in user AND that the user has access to the given site.
 * Admins have access to every site. Others need a row in `memberships`
 * linking them to that site; otherwise they're redirected back to /admin
 * with an error flag.
 *
 * Returns the user (unchanged signature — every content action depends on it).
 * Use requireSiteAccessWithRole / requireSiteOwner when the role matters.
 */
export async function requireSiteAccess(siteId: string): Promise<AuthUser> {
  const access = await requireSiteAccessWithRole(siteId);
  return access.user;
}

/** Like requireSiteAccess but also tells you whether the user is an owner. */
export async function requireSiteAccessWithRole(siteId: string): Promise<SiteAccess> {
  const user = await requireUser();
  const siteRole = await getSiteRole(user, siteId);

  if (!siteRole) {
    redirect("/admin?error=forbidden");
  }

  return { user, siteRole, isOwner: siteRole === "owner" };
}

/**
 * Requires admin or an owner-membership on the site. Gates settings,
 * integration, members and structure (pages/blocks) management.
 * Editors are redirected to the site's overview with an error flag.
 */
export async function requireSiteOwner(siteId: string): Promise<AuthUser> {
  const access = await requireSiteAccessWithRole(siteId);

  if (!access.isOwner) {
    redirect(`/admin/sites/${siteId}?error=owner-only`);
  }

  return access.user;
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

/**
 * Site ids where the user is an owner (all sites for admins). Used by the
 * shell to decide which navigation items to show per site.
 */
export async function getOwnedSiteIds(user: AuthUser): Promise<string[]> {
  if (user.role === "admin") {
    const rows = await db.select({ id: sites.id }).from(sites);
    return rows.map((r) => r.id);
  }

  const rows = await db
    .select({ siteId: memberships.siteId })
    .from(memberships)
    .where(and(eq(memberships.userId, user.id), eq(memberships.role, "owner")));

  return rows.map((r) => r.siteId);
}
