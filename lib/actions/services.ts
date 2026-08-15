"use server";

import { and, asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, services } from "@/lib/db";
import { requireSiteAccess } from "@/lib/guard";
import { triggerSiteRevalidation } from "@/lib/revalidate";

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function afterChange(siteId: string): Promise<void> {
  revalidatePath(`/admin/sites/${siteId}/services`);
  await triggerSiteRevalidation(siteId);
}

/** Adds a new blank service at the end of the list, ready for inline editing. */
export async function createService(siteId: string): Promise<void> {
  await requireSiteAccess(siteId);

  const existing = await db
    .select({ sortOrder: services.sortOrder })
    .from(services)
    .where(eq(services.siteId, siteId));

  const nextSortOrder =
    existing.length > 0 ? Math.max(...existing.map((row) => row.sortOrder)) + 1 : 0;

  await db.insert(services).values({
    siteId,
    title: "Ny tjänst",
    description: "",
    price: "",
    sortOrder: nextSortOrder,
    visible: true,
  });

  await afterChange(siteId);
  redirect(`/admin/sites/${siteId}/services`);
}

/** Saves the inline-edited fields for one service row. */
export async function updateService(
  siteId: string,
  serviceId: string,
  formData: FormData,
): Promise<void> {
  await requireSiteAccess(siteId);

  const title = readString(formData, "title") || "Namnlös tjänst";
  const description = readString(formData, "description") || null;
  const price = readString(formData, "price") || null;
  const visible = formData.get("visible") === "on";

  await db
    .update(services)
    .set({ title, description, price, visible, updatedAt: new Date() })
    .where(and(eq(services.id, serviceId), eq(services.siteId, siteId)));

  await afterChange(siteId);
  redirect(`/admin/sites/${siteId}/services`);
}

export async function deleteService(siteId: string, serviceId: string): Promise<void> {
  await requireSiteAccess(siteId);

  await db.delete(services).where(and(eq(services.id, serviceId), eq(services.siteId, siteId)));

  await afterChange(siteId);
  redirect(`/admin/sites/${siteId}/services`);
}

/** Swaps sortOrder with the previous/next service so the row moves up/down one step. */
export async function moveService(
  siteId: string,
  serviceId: string,
  direction: "up" | "down",
): Promise<void> {
  await requireSiteAccess(siteId);

  const rows = await db
    .select({ id: services.id, sortOrder: services.sortOrder })
    .from(services)
    .where(eq(services.siteId, siteId))
    .orderBy(asc(services.sortOrder));

  const index = rows.findIndex((row) => row.id === serviceId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;

  if (index !== -1 && swapIndex >= 0 && swapIndex < rows.length) {
    const current = rows[index];
    const swap = rows[swapIndex];

    await db
      .update(services)
      .set({ sortOrder: swap.sortOrder, updatedAt: new Date() })
      .where(eq(services.id, current.id));
    await db
      .update(services)
      .set({ sortOrder: current.sortOrder, updatedAt: new Date() })
      .where(eq(services.id, swap.id));

    await afterChange(siteId);
  }

  redirect(`/admin/sites/${siteId}/services`);
}
