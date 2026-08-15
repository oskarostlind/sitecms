import { redirect } from "next/navigation";
import { requireUser, type AuthUser } from "./guard";

/**
 * Requires a logged-in user with the 'admin' role. Gates the site- and
 * user-management screens (app/admin/sites/new, .../installningar,
 * app/admin/anvandare) and the server actions behind them
 * (lib/actions/sites.ts, lib/actions/users.ts).
 *
 * Non-admins are redirected to /admin?error=forbidden — the same flag
 * requireSiteAccess (lib/guard.ts) uses, so app/admin/page.tsx renders one
 * consistent "no access" message regardless of which guard rejected the
 * request.
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireUser();

  if (user.role !== "admin") {
    redirect("/admin?error=forbidden");
  }

  return user;
}
