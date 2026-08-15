"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { blocks, pages } from "@/lib/db/schema";
import { requireSiteAccess } from "@/lib/guard";
import { triggerSiteRevalidation } from "@/lib/revalidate";
import { logActivity } from "@/lib/audit";

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
  const user = await requireSiteAccess(siteId);

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

  // Aktivitetsloggen: ta reda på vilken/vilka sidor blocken tillhör så
  // loggposten blir begriplig ("Uppdaterade 3 block på Startsida").
  try {
    const affectedPages = await db
      .selectDistinct({ title: pages.title })
      .from(blocks)
      .innerJoin(pages, eq(blocks.pageId, pages.id))
      .where(inArray(blocks.id, updates.map((u) => u.blockId)));

    const pageLabel =
      affectedPages.length === 1
        ? affectedPages[0].title
        : `${affectedPages.length} sidor`;

    await logActivity({
      userId: user.id,
      userEmail: user.email,
      siteId,
      action: "blocks.update",
      detail: `Uppdaterade ${updates.length} block på ${pageLabel}`,
    });
  } catch (err) {
    console.error("updateBlocks: kunde inte skriva aktivitetslogg", err);
  }

  return { ok: true };
}
