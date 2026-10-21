import { headers } from "next/headers";

/**
 * Absolute base URL of this deployment, used for links in e-mails.
 * Order: APP_URL env → request host (works on every Vercel URL) → prod default.
 */
export async function appUrl(): Promise<string> {
  const fromEnv = process.env.APP_URL?.trim().replace(/\/+$/, "");
  if (fromEnv) return fromEnv;

  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    if (host) return `${proto}://${host}`;
  } catch {
    // headers() is unavailable outside a request (scripts) — fall through.
  }

  return "https://sitecms.se";
}
