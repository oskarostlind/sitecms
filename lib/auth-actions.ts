"use server";

import { redirect } from "next/navigation";
import { AuthError, CredentialsSignin } from "next-auth";
import { signIn, signOut } from "./auth";
import { safeCallbackPath } from "./account-flows";

function loginUrl(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const q = search.toString();
  return q ? `/login?${q}` : "/login";
}

/**
 * Server action backing the /login form. On success, Auth.js redirects to
 * callbackUrl (default /admin) itself. On failure, redirects back to /login
 * with an ?error= query param so the (server-rendered, JS-free) page can show
 * a Swedish error message:
 *
 * - missing    — e-post eller lösenord saknas
 * - invalid    — fel e-post/lösenord (eller konto utan lösenord)
 * - unverified — rätt lösenord men e-posten är inte bekräftad ännu
 */
export async function loginAction(formData: FormData): Promise<void> {
  const email = formData.get("email");
  const password = formData.get("password");
  const rawCallback = formData.get("callbackUrl");
  const callbackUrl = safeCallbackPath(rawCallback);
  // Skicka bara med callbackUrl tillbaka till /login när den inte är standard.
  const keepCallback = callbackUrl !== "/admin" ? callbackUrl : undefined;

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    email.trim() === "" ||
    password === ""
  ) {
    redirect(loginUrl({ error: "missing", callbackUrl: keepCallback }));
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (error instanceof CredentialsSignin && error.code === "unverified") {
      redirect(
        loginUrl({ error: "unverified", email: email.trim().toLowerCase(), callbackUrl: keepCallback }),
      );
    }
    if (error instanceof AuthError) {
      redirect(loginUrl({ error: "invalid", callbackUrl: keepCallback }));
    }
    // Auth.js signals a successful sign-in by throwing Next.js's internal
    // redirect error — let it propagate so the redirect actually happens.
    throw error;
  }
}

/**
 * Server action backing the "Logga in med Google" button on /login (and
 * /signup). Only rendered when googleAuthEnabled is true. Auth.js redirects
 * to Google's consent screen; on return, the signIn callback in lib/auth.ts
 * creates the account if the address is new.
 */
export async function loginWithGoogleAction(formData?: FormData): Promise<void> {
  const callbackUrl = safeCallbackPath(formData?.get("callbackUrl"));
  await signIn("google", { redirectTo: callbackUrl });
}

/**
 * Server action for logging out. Clears the session and redirects to /login.
 */
export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
