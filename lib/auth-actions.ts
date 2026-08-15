"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn, signOut } from "./auth";

/**
 * Server action backing the /login form. On success, Auth.js redirects to
 * /admin itself (via redirectTo). On failure, redirects back to /login with
 * an ?error= query param so the (server-rendered, JS-free) page can show a
 * Swedish error message.
 */
export async function loginAction(formData: FormData): Promise<void> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    email.trim() === "" ||
    password === ""
  ) {
    redirect("/login?error=missing");
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/admin",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=invalid");
    }
    // Auth.js signals a successful sign-in by throwing Next.js's internal
    // redirect error — let it propagate so the redirect actually happens.
    throw error;
  }
}

/**
 * Server action for logging out. Clears the session and redirects to /login.
 */
export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
