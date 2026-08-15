"use server";

import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, posts } from "@/lib/db";
import { requireSiteAccess } from "@/lib/guard";
import { triggerSiteRevalidation } from "@/lib/revalidate";
import { slugify } from "@/components/content/slugify";

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
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
  await requireSiteAccess(siteId);

  const title = readString(formData, "title") || "Namnlöst inlägg";
  const slugInput = readString(formData, "slug");
  const baseSlug = slugify(slugInput || title) || `inlagg-${nanoid(8)}`;
  const slug = await uniqueSlug(siteId, baseSlug, postId || undefined);

  const excerpt = readString(formData, "excerpt") || null;
  const body = readString(formData, "body") || null;
  const coverImage = readString(formData, "coverImage") || null;
  const published = formData.get("published") === "on";

  let postIdForRevalidate = postId;

  if (postId) {
    const [existing] = await db
      .select({ published: posts.published, publishedAt: posts.publishedAt })
      .from(posts)
      .where(and(eq(posts.id, postId), eq(posts.siteId, siteId)))
      .limit(1);

    if (!existing) {
      throw new Error("Inlägget hittades inte.");
    }

    await db
      .update(posts)
      .set({
        title,
        slug,
        excerpt,
        body,
        coverImage,
        published,
        publishedAt: published && !existing.publishedAt ? new Date() : existing.publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, postId));
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
        published,
        publishedAt: published ? new Date() : null,
      })
      .returning({ id: posts.id });

    postIdForRevalidate = created.id;
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
  await requireSiteAccess(siteId);

  await db.delete(posts).where(and(eq(posts.id, postId), eq(posts.siteId, siteId)));

  revalidatePath(`/admin/sites/${siteId}/posts`);
  await triggerSiteRevalidation(siteId);

  redirect(`/admin/sites/${siteId}/posts`);
}
