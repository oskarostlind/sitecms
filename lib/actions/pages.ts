"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { blocks } from "@/lib/db/schema";
import { requireSiteAccess } from "@/lib/guard";
import { triggerSiteRevalidation } from "@/lib/revalidate";

export type BlockUpdate = {
  blockId: string;
  value: string;
};

export type UpdateBlocksResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Sparar ett eller flera block för en sajt. Skyddas av requireSiteAccess
 * (kastar/redirectar om användaren saknar åtkomst till siteId). Efter
 * lyckad uppdatering revalidateras adminvyerna för sajten och en
 * on-demand-revalidation triggas mot kundens live-sajt.
 */
export async function updateBlocks(
  siteId: string,
  updates: BlockUpdate[]
): Promise<UpdateBlocksResult> {
  await requireSiteAccess(siteId);

  if (!updates || updates.length === 0) {
    return { ok: true };
  }

  try {
    for (const update of updates) {
      await db
        .update(blocks)
        .set({ value: update.value, updatedAt: new Date() })
        .where(and(eq(blocks.id, update.blockId), eq(blocks.siteId, siteId)));
    }
  } catch (err) {
    console.error("updateBlocks: misslyckades att spara block", err);
    return { ok: false, error: "Kunde inte spara ändringarna. Försök igen." };
  }

  // Revalidera hela adminträdet för sajten (översikt, sidlista, redigerare).
  revalidatePath(`/admin/sites/${siteId}`, "layout");

  // Be kundens live-sajt hämta nytt innehåll. Får inte stoppa ett i övrigt
  // lyckat spar-svar om revalidation mot frontend-sajten skulle strula.
  try {
    await triggerSiteRevalidation(siteId);
  } catch (err) {
    console.error("updateBlocks: triggerSiteRevalidation misslyckades", err);
  }

  return { ok: true };
}
