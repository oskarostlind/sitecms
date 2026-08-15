"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { db, media } from "@/lib/db";
import { requireSiteAccess } from "@/lib/guard";
import { logActivity } from "@/lib/audit";

export type DeleteMediaResult = { ok: true } | { ok: false; error: string };

/**
 * Deletes a media item: removes the blob from Vercel Blob storage (best
 * effort — a missing/already-deleted blob must not block removing the DB
 * row) and deletes the media table row. Called directly from the client
 * media grid (components/admin/MediaGrid.tsx), not as a <form action>.
 */
export async function deleteMedia(
  siteId: string,
  mediaId: string
): Promise<DeleteMediaResult> {
  const user = await requireSiteAccess(siteId);

  const [existing] = await db
    .select()
    .from(media)
    .where(and(eq(media.id, mediaId), eq(media.siteId, siteId)))
    .limit(1);

  if (!existing) {
    return { ok: false, error: "Filen hittades inte." };
  }

  try {
    await del(existing.url);
  } catch (err) {
    // Blobben kan redan vara borttagen eller lagringen tillfälligt otillgänglig.
    // Vi fortsätter ändå och tar bort DB-raden så biblioteket inte visar
    // "spökfiler" som inte går att ta bort.
    console.error("deleteMedia: kunde inte ta bort blob", err);
  }

  try {
    await db
      .delete(media)
      .where(and(eq(media.id, mediaId), eq(media.siteId, siteId)));
  } catch (err) {
    console.error("deleteMedia: kunde inte ta bort DB-raden", err);
    return { ok: false, error: "Kunde inte ta bort filen. Försök igen." };
  }

  await logActivity({
    userId: user.id,
    userEmail: user.email,
    siteId,
    action: "media.delete",
    detail: `Tog bort filen "${existing.filename}"`,
  });

  revalidatePath(`/admin/sites/${siteId}/media`);

  return { ok: true };
}
