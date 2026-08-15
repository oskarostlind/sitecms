import { signOut } from "@/lib/auth";

/**
 * Visiting /logout signs the current user out and redirects to /login.
 * The same behaviour is available as a reusable server action via
 * lib/auth-actions.ts (logoutAction) for use in forms/buttons elsewhere
 * in the app.
 */
export default async function LogoutPage() {
  await signOut({ redirectTo: "/login" });
}
