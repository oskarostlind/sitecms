"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, seoMeta } from "@/lib/db";
import { requireSiteAccess } from "@/lib/guard";
import { triggerSiteRevalidation } from "@/lib/revalidate";

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function afterChange(siteId: string): Promise<void> {
  revalidatePath(`/admin/sites/${siteId}/seo`);
  await triggerSiteRevalidation(siteId);
}

/** Creates a blank SEO entry for a new page slug, then jumps to editing it. */
export async function createSeoMeta(siteId: string, formData: FormData): Promise<void> {
  await requireSiteAccess(siteId);

  const pageSlug = readString(formData, "pageSlug");
  if (!pageSlug) {
    throw new Error("Sidans slug krävs.");
  }

  const [created] = await db
    .insert(seoMeta)
    .values({ siteId, pageSlug, title: "", description: "", ogImage: "" })
    .returning({ id: seoMeta.id });

  await afterChange(siteId);
  redirect(`/admin/sites/${siteId}/seo/${created.id}`);
}

export async function updateSeoMeta(
  siteId: string,
  seoId: string,
  formData: FormData,
): Promise<void> {
  await requireSiteAccess(siteId);

  const title = readString(formData, "title") || null;
  const description = readString(formData, "description") || null;
  const ogImage = readString(formData, "ogImage") || null;

  await db
    .update(seoMeta)
    .set({ title, description, ogImage, updatedAt: new Date() })
    .where(and(eq(seoMeta.id, seoId), eq(seoMeta.siteId, siteId)));

  await afterChange(siteId);
  redirect(`/admin/sites/${siteId}/seo`);
}

export async function deleteSeoMeta(siteId: string, seoId: string): Promise<void> {
  await requireSiteAccess(siteId);

  await db.delete(seoMeta).where(and(eq(seoMeta.id, seoId), eq(seoMeta.siteId, siteId)));

  await afterChange(siteId);
  redirect(`/admin/sites/${siteId}/seo`);
}
