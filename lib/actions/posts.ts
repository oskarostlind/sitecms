"use server";

import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, posts } from "@/lib/db";
import { requireSiteAccess } from "@/lib/guard";
import { triggerSiteRevalidation } from "@/lib/revalidate";
import { slugify } from "@/components/content/slugify";
import { logActivity } from "@/lib/audit";
import type { PostSnapshot } from "@/lib/undo-data";

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

type PostRow = typeof posts.$inferSelect;

/** Gör om en inläggsrad till en JSON-vänlig ögonblicksbild för ångra-funktionen. */
function snapshotPost(row: PostRow): PostSnapshot {
  return {
    id: row.id,
    siteId: row.siteId,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    coverImage: row.coverImage,
    coverImageAlt: row.coverImageAlt,
    published: row.published,
    publishedAt: row.publishedAt ? new Date(row.publishedAt).toISOString() : null,
  };
}

/** Finds a slug that is free for this site, appending -2, -3, ... on collision. */
async function uniqueSlug(siteId: string, base: string, excludeId?: string): Promise<string> {
  let candidate = base;
  let attempt = 2;

  for (;;) {
    const conflicts = await db
      .select({ id: posts.id })
      .from(posts)
      .where(and(eq(posts.siteId, siteId), eq(posts.slug, candidate)))
      .limit(1);

    if (conflicts.length === 0 || conflicts[0].id === excludeId) {
      return candidate;
    }

    candidate = `${base}-${attempt}`;
    attempt += 1;
  }
}

/**
 * Creates or updates a post depending on whether the hidden "postId" field is
 * present in the submitted form. Used directly as a <form action> from both
 * the "new post" and "edit post" pages.
 */
export async function savePost(formData: FormData): Promise<void> {
  const siteId = readString(formData, "siteId");
  const postId = readString(formData, "postId");
  const user = await requireSiteAccess(siteId);

  const title = readString(formData, "title") || "Namnlöst inlägg";
  const slugInput = readString(formData, "slug");
  const baseSlug = slugify(slugInput || title) || `inlagg-${nanoid(8)}`;
  const slug = await uniqueSlug(siteId, baseSlug, postId || undefined);

  const excerpt = readString(formData, "excerpt") || null;
  // Formulärposter normaliserar radbrytningar till CRLF; markdown lagras med
  // rena radbrytningar så att texten ser likadan ut oavsett var den skrevs.
  const body = readString(formData, "body").replace(/\r\n?/g, "\n") || null;
  const coverImage = readString(formData, "coverImage") || null;
  const coverImageAlt = readString(formData, "coverImageAlt") || null;
  const published = formData.get("published") === "on";

  let postIdForRevalidate = postId;
  let justPublished = false;

  if (postId) {
    const [existing] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.id, postId), eq(posts.siteId, siteId)))
      .limit(1);

    if (!existing) {
      throw new Error("Inlägget hittades inte.");
    }

    justPublished = published && !existing.published;

    await db
      .update(posts)
      .set({
        title,
        slug,
        excerpt,
        body,
        coverImage,
        coverImageAlt,
        published,
        publishedAt: published && !existing.publishedAt ? new Date() : existing.publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, postId));

    await logActivity({
      userId: user.id,
      userEmail: user.email,
      siteId,
      action: justPublished ? "posts.publish" : "posts.update",
      detail: justPublished
        ? `Publicerade inlägget "${title}"`
        : `Uppdaterade inlägget "${title}"`,
      // Hela inlägget som det såg ut innan, så att en felredigering (eller en
      // publicering som inte var tänkt) går att ta tillbaka.
      undoData: { kind: "post.update", post: snapshotPost(existing) },
    });
  } else {
    const [created] = await db
      .insert(posts)
      .values({
        siteId,
        title,
        slug,
        excerpt,
        body,
        coverImage,
        coverImageAlt,
        published,
        publishedAt: published ? new Date() : null,
      })
      .returning({ id: posts.id });

    postIdForRevalidate = created.id;

    await logActivity({
      userId: user.id,
      userEmail: user.email,
      siteId,
      action: "posts.create",
      detail: published
        ? `Skapade och publicerade inlägget "${title}"`
        : `Skapade inlägget "${title}"`,
    });
  }

  revalidatePath(`/admin/sites/${siteId}/posts`);
  if (postIdForRevalidate) {
    revalidatePath(`/admin/sites/${siteId}/posts/${postIdForRevalidate}`);
  }
  await triggerSiteRevalidation(siteId);

  redirect(`/admin/sites/${siteId}/posts`);
}

/** Deletes a post. Bound to (siteId, postId) as a <form action> on the edit page. */
export async function deletePost(siteId: string, postId: string): Promise<void> {
  const user = await requireSiteAccess(siteId);

  const [existing] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.siteId, siteId)))
    .limit(1);

  await db.delete(posts).where(and(eq(posts.id, postId), eq(posts.siteId, siteId)));

  if (existing) {
    await logActivity({
      userId: user.id,
      userEmail: user.email,
      siteId,
      action: "posts.delete",
      detail: `Tog bort inlägget "${existing.title}"`,
      // Hela raden sparas i loggen så att ett felaktigt borttaget inlägg går
      // att lägga tillbaka från aktivitetsloggen.
      undoData: { kind: "post.delete", post: snapshotPost(existing) },
    });
  }

  revalidatePath(`/admin/sites/${siteId}/posts`);
  await triggerSiteRevalidation(siteId);

  redirect(`/admin/sites/${siteId}/posts`);
}
