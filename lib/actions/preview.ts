"use server";

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sites } from "@/lib/db/schema";
import { requireSiteAccess } from "@/lib/guard";
import {
  createPreviewSession,
  deletePreviewSession,
  panelOriginFromHeaders,
  previewBaseUrl,
  replacePreviewOverrides,
} from "@/lib/preview";

/**
 * Server actions för live-förhandsgranskningen i sidredigeraren
 * (docs/LIVE-PREVIEW.md §3.3). Alla kräver åtkomst till sajten (owner eller
 * editor). Sessionen är knuten till användaren: ingen annan kan ändra eller
 * avsluta den.
 */

export type StartPreviewResult =
  | { ok: true; token: string; previewBaseUrl: string | null; expiresAt: string }
  | { ok: false; error: string };

export type SetPreviewOverridesResult =
  | { ok: true; expiresAt: string }
  /** `code` (additivt): "expired" = starta en ny session, "invalid" = fel i datat. */
  | { ok: false; error: string; code?: "expired" | "invalid" };

/**
 * Startar en session. Panelens origin tas från requestens headers
 * (x-forwarded-proto/host eller host) — aldrig från klienten — och blir den
 * enda origin kundsajten tar emot meddelanden från.
 */
export async function startPreviewSession(siteId: string): Promise<StartPreviewResult> {
  const user = await requireSiteAccess(siteId);

  const panelOrigin = panelOriginFromHeaders(await headers());
  if (!panelOrigin) {
    return { ok: false, error: "Kunde inte avgöra panelens adress. Ladda om sidan och försök igen." };
  }

  try {
    const [site] = await db
      .select({ previewUrl: sites.previewUrl, domain: sites.domain, revalidateUrl: sites.revalidateUrl })
      .from(sites)
      .where(eq(sites.id, siteId))
      .limit(1);
    if (!site) return { ok: false, error: "Sajten finns inte längre." };

    const { token, session } = await createPreviewSession({ siteId, userId: user.id, panelOrigin });
    return {
      ok: true,
      token,
      previewBaseUrl: previewBaseUrl(site),
      expiresAt: session.expiresAt.toISOString(),
    };
  } catch (err) {
    console.error("startPreviewSession misslyckades", err);
    return { ok: false, error: "Kunde inte starta förhandsgranskningen. Försök igen." };
  }
}

/**
 * Ersätter sessionens osparade ändringar med `updates` (hela mängden) och
 * förlänger sessionen 2 h. Max 200 block och 200 kB; varje block måste tillhöra sajten.
 */
export async function setPreviewOverrides(
  siteId: string,
  token: string,
  updates: { blockId: string; value: string; alt?: string | null }[],
): Promise<SetPreviewOverridesResult> {
  const user = await requireSiteAccess(siteId);
  try {
    const result = await replacePreviewOverrides({ siteId, userId: user.id, token, updates });
    if (!result.ok) return { ok: false, error: result.error, code: result.code };
    return { ok: true, expiresAt: result.expiresAt.toISOString() };
  } catch (err) {
    console.error("setPreviewOverrides misslyckades", err);
    return { ok: false, error: "Kunde inte uppdatera förhandsgranskningen. Försök igen." };
  }
}

/** Avslutar sessionen (Stäng / lämnar redigeraren). */
export async function endPreviewSession(siteId: string, token: string): Promise<{ ok: true }> {
  const user = await requireSiteAccess(siteId);
  try {
    await deletePreviewSession({ siteId, userId: user.id, token });
  } catch (err) {
    // Sessionen går ut av sig själv inom 2 h — inget att visa för användaren.
    console.error("endPreviewSession misslyckades", err);
  }
  return { ok: true };
}
