"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sites } from "@/lib/db/schema";
import { requireSiteOwner } from "@/lib/guard";
import { logActivity } from "@/lib/audit";

const TIMEOUT_MS = 8000;
const MAX_DETAIL_LENGTH = 200;

type CheckResult = { ok: boolean; detail: string };

function shorten(value: string): string {
  const oneLine = value.replace(/\s+/g, " ").trim();
  return oneLine.length > MAX_DETAIL_LENGTH ? `${oneLine.slice(0, MAX_DETAIL_LENGTH - 1)}…` : oneLine;
}

/** Svensk, kort beskrivning av varför ett anrop misslyckades. */
function describeFetchError(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === "AbortError" || err.name === "TimeoutError") {
      return `Inget svar inom ${TIMEOUT_MS / 1000} sekunder.`;
    }
    const cause = (err as Error & { cause?: { code?: string; message?: string } }).cause;
    const code = cause?.code;
    if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "Domänen hittades inte (DNS).";
    if (code === "ECONNREFUSED") return "Anslutningen nekades.";
    if (code === "ECONNRESET") return "Anslutningen bröts.";
    if ((code && code.startsWith("ERR_TLS")) || code === "CERT_HAS_EXPIRED" || code === "DEPTH_ZERO_SELF_SIGNED_CERT") {
      return "Problem med sajtens TLS-certifikat.";
    }
    return shorten(cause?.message ?? err.message);
  }
  return "Okänt fel.";
}

async function pingRevalidateUrl(url: string, secret: string): Promise<CheckResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, detail: "Revalidate-URL:en är inte en giltig adress." };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, detail: "Revalidate-URL:en måste börja med https://." };
  }

  try {
    const res = await fetch(parsed, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "sitecms-connection-check" },
      body: JSON.stringify({ secret }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "manual",
      cache: "no-store",
    });

    if (res.status >= 200 && res.status < 300) {
      return { ok: true, detail: `Svarade HTTP ${res.status}.` };
    }

    let hint = "";
    if (res.status === 401 || res.status === 403) {
      hint = " Hemligheten stämmer inte — kontrollera CMS_REVALIDATE_SECRET på kundsajten.";
    } else if (res.status === 404) {
      hint = " Routen finns inte — har app/api/sitecms/revalidate/route.ts deployats?";
    } else if (res.status === 405) {
      hint = " Routen tar inte emot POST.";
    } else if (res.status >= 300 && res.status < 400) {
      hint = " Adressen omdirigerar — ange den slutliga URL:en (t.ex. med www eller https).";
    } else if (res.status >= 500) {
      hint = " Felet uppstod på kundsajten — kolla dess loggar.";
    }
    return { ok: false, detail: `Svarade HTTP ${res.status}.${hint}` };
  } catch (err) {
    return { ok: false, detail: describeFetchError(err) };
  }
}

/**
 * Testar kopplingen till kundsajten: POST:ar `{ secret }` till sajtens
 * revalidate-URL precis som en riktig sparning gör, och förväntar sig 2xx.
 * Resultatet sparas på sajten (lastConnectionStatus/CheckedAt), loggas som
 * `sites.connection_check` och visas på integrationssidan via
 * `?check=ok|failed&detail=…`.
 */
export async function checkConnection(siteId: string): Promise<void> {
  const user = await requireSiteOwner(siteId);
  const target = `/admin/sites/${siteId}/integration`;

  const [site] = await db
    .select({ name: sites.name, revalidateUrl: sites.revalidateUrl, revalidateSecret: sites.revalidateSecret })
    .from(sites)
    .where(eq(sites.id, siteId))
    .limit(1);

  if (!site) {
    redirect("/admin?error=not-found");
  }

  let result: CheckResult;
  if (!site.revalidateUrl) {
    result = { ok: false, detail: "Ingen revalidate-URL är angiven ännu." };
  } else if (!site.revalidateSecret) {
    result = { ok: false, detail: "Ingen revalidate-hemlighet är genererad ännu." };
  } else {
    result = await pingRevalidateUrl(site.revalidateUrl, site.revalidateSecret);
  }

  const status = result.ok ? "ok" : "failed";

  await db
    .update(sites)
    .set({ lastConnectionStatus: status, lastConnectionCheckedAt: new Date() })
    .where(eq(sites.id, siteId));

  await logActivity({
    userId: user.id,
    userEmail: user.email,
    siteId,
    action: "sites.connection_check",
    detail: result.ok
      ? `Testade anslutningen till ${site.revalidateUrl} — fungerar (${result.detail})`
      : `Testade anslutningen${site.revalidateUrl ? ` till ${site.revalidateUrl}` : ""} — misslyckades: ${result.detail}`,
  });

  revalidatePath(target);

  const query = new URLSearchParams({ check: status, detail: result.detail });
  redirect(`${target}?${query.toString()}`);
}
