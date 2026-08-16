"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auditLogs, blocks, posts } from "@/lib/db/schema";
import { requireSiteAccess } from "@/lib/guard";
import { triggerSiteRevalidation } from "@/lib/revalidate";
import { logActivity } from "@/lib/audit";
import { isUndoData, type PostSnapshot, type UndoData } from "@/lib/undo-data";

export type UndoResult =
  | { ok: true; detail: string }
  | { ok: false; error: string };

/**
 * Hittar en ledig slug för ett återställt inlägg. Under tiden som inlägget var
 * borttaget kan någon annan ha tagit adressen — då får det återställda
 * inlägget suffix i stället för att återställningen misslyckas.
 */
async function freeSlug(siteId: string, base: string, postId: string): Promise<string> {
  let candidate = base;
  let attempt = 2;

  for (;;) {
    const conflicts = await db
      .select({ id: posts.id })
      .from(posts)
      .where(
        and(
          eq(posts.siteId, siteId),
          eq(posts.slug, candidate),
          ne(posts.id, postId)
        )
      )
      .limit(1);

    if (conflicts.length === 0) return candidate;

    candidate = `${base}-${attempt}`;
    attempt += 1;
  }
}

async function restorePost(siteId: string, snapshot: PostSnapshot): Promise<string> {
  const slug = await freeSlug(siteId, snapshot.slug, snapshot.id);
  const publishedAt = snapshot.publishedAt ? new Date(snapshot.publishedAt) : null;

  const [existing] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.id, snapshot.id), eq(posts.siteId, siteId)))
    .limit(1);

  const values = {
    slug,
    title: snapshot.title,
    excerpt: snapshot.excerpt,
    body: snapshot.body,
    coverImage: snapshot.coverImage,
    coverImageAlt: snapshot.coverImageAlt,
    published: snapshot.published,
    publishedAt,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(posts).set(values).where(eq(posts.id, snapshot.id));
  } else {
    // Inlägget var borttaget — lägg tillbaka det med samma id, så att
    // eventuella länkar och loggposter fortsätter peka rätt.
    await db.insert(posts).values({ id: snapshot.id, siteId, ...values });
  }

  return snapshot.title;
}

async function applyUndo(siteId: string, data: UndoData): Promise<string> {
  switch (data.kind) {
    case "blocks": {
      for (const snapshot of data.blocks) {
        await db
          .update(blocks)
          .set({ value: snapshot.value, alt: snapshot.alt, updatedAt: new Date() })
          .where(and(eq(blocks.id, snapshot.blockId), eq(blocks.siteId, siteId)));
      }
      return `${data.blocks.length} block återställdes`;
    }

    case "post.update": {
      const title = await restorePost(siteId, data.post);
      return `Inlägget "${title}" återställdes`;
    }

    case "post.delete": {
      const title = await restorePost(siteId, data.post);
      return `Inlägget "${title}" lades tillbaka`;
    }
  }
}

/**
 * Ångrar en ändring utifrån ögonblicksbilden i aktivitetsloggen.
 *
 * Varje post kan bara ångras en gång (undoneAt sätts), och åtkomsten
 * kontrolleras mot sajten som posten hör till — en kund kan aldrig ångra
 * något på någon annans sajt. Själva ångrandet loggas i sin tur, så
 * historiken förblir komplett.
 */
export async function undoActivity(logId: string): Promise<UndoResult> {
  const [entry] = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.id, logId))
    .limit(1);

  if (!entry) {
    return { ok: false, error: "Händelsen hittades inte." };
  }

  if (!entry.siteId) {
    return { ok: false, error: "Den här händelsen går inte att ångra." };
  }

  const user = await requireSiteAccess(entry.siteId);

  if (entry.undoneAt) {
    return { ok: false, error: "Ändringen är redan ångrad." };
  }

  if (!isUndoData(entry.undoData)) {
    return { ok: false, error: "Den här händelsen går inte att ångra." };
  }

  let detail: string;

  try {
    detail = await applyUndo(entry.siteId, entry.undoData);
  } catch (err) {
    console.error("undoActivity: kunde inte återställa", err);
    return { ok: false, error: "Kunde inte ångra ändringen. Försök igen." };
  }

  try {
    await db
      .update(auditLogs)
      .set({ undoneAt: new Date() })
      .where(eq(auditLogs.id, logId));
  } catch (err) {
    console.error("undoActivity: kunde inte markera posten som ångrad", err);
  }

  await logActivity({
    userId: user.id,
    userEmail: user.email,
    siteId: entry.siteId,
    action: "activity.undo",
    detail: `Ångrade: ${entry.detail ?? entry.action} (${detail})`,
  });

  revalidatePath(`/admin/sites/${entry.siteId}`, "layout");
  revalidatePath("/admin/aktivitet");

  try {
    await triggerSiteRevalidation(entry.siteId);
  } catch (err) {
    console.error("undoActivity: triggerSiteRevalidation misslyckades", err);
  }

  return { ok: true, detail };
}
