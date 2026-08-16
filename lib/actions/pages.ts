"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { blocks, pages } from "@/lib/db/schema";
import { requireSiteAccess } from "@/lib/guard";
import { triggerSiteRevalidation } from "@/lib/revalidate";
import { logActivity } from "@/lib/audit";
import type { BlockSnapshot } from "@/lib/undo-data";

export type BlockUpdate = {
  blockId: string;
  value: string;
  /** Bildens alt-text. Utelämnad = kolumnen lämnas orörd (t.ex. textblock). */
  alt?: string | null;
};

export type UpdateBlocksResult =
  /** undoId pekar på aktivitetsloggposten som kan ångra just den här sparningen. */
  | { ok: true; undoId: string | null }
  | { ok: false; error: string };

/**
 * Sparar ett eller flera block för en sajt. Skyddas av requireSiteAccess
 * (kastar/redirectar om användaren saknar åtkomst till siteId). Efter
 * lyckad uppdatering revalidateras adminvyerna för sajten och en
 * on-demand-revalidation triggas mot kundens live-sajt.
 *
 * Före skrivningen tas en ögonblicksbild av de berörda blocken. Den läggs i
 * aktivitetsloggen så att ändringen kan ångras — sparning går rakt ut på
 * kundens skarpa sajt, och då måste vägen tillbaka vara ett klick bort.
 */
export async function updateBlocks(
  siteId: string,
  updates: BlockUpdate[]
): Promise<UpdateBlocksResult> {
  const user = await requireSiteAccess(siteId);

  if (!updates || updates.length === 0) {
    return { ok: true, undoId: null };
  }

  const blockIds = updates.map((update) => update.blockId);
  let before: BlockSnapshot[] = [];

  try {
    before = await db
      .select({ blockId: blocks.id, value: blocks.value, alt: blocks.alt })
      .from(blocks)
      .where(and(inArray(blocks.id, blockIds), eq(blocks.siteId, siteId)));
  } catch (err) {
    // Utan ögonblicksbild går ändringen inte att ångra, men den ska ändå
    // kunna sparas.
    console.error("updateBlocks: kunde inte läsa tidigare värden", err);
  }

  try {
    for (const update of updates) {
      await db
        .update(blocks)
        .set({
          value: update.value,
          ...(update.alt === undefined ? {} : { alt: update.alt }),
          updatedAt: new Date(),
        })
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
  let undoId: string | null = null;

  try {
    const affectedPages = await db
      .selectDistinct({ title: pages.title })
      .from(blocks)
      .innerJoin(pages, eq(blocks.pageId, pages.id))
      .where(inArray(blocks.id, blockIds));

    const pageLabel =
      affectedPages.length === 1
        ? affectedPages[0].title
        : `${affectedPages.length} sidor`;

    undoId = await logActivity({
      userId: user.id,
      userEmail: user.email,
      siteId,
      action: "blocks.update",
      detail: `Uppdaterade ${updates.length} block på ${pageLabel}`,
      undoData: before.length > 0 ? { kind: "blocks", blocks: before } : null,
    });
  } catch (err) {
    console.error("updateBlocks: kunde inte skriva aktivitetslogg", err);
  }

  return { ok: true, undoId };
}
