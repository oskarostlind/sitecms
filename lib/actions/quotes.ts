"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, quoteRequests, quoteStatusValues, type QuoteStatus } from "@/lib/db";
import { requireSiteAccess } from "@/lib/guard";
import { logActivity } from "@/lib/audit";
import { deleteAttachmentBlobs } from "@/lib/quote-attachments";

const STATUS_LABELS: Record<QuoteStatus, string> = {
  ny: "ny",
  besvarad: "besvarad",
  arkiverad: "arkiverad",
};

export async function setQuoteStatus(siteId: string, quoteId: string, formData: FormData): Promise<void> {
  const user = await requireSiteAccess(siteId);
  const status = formData.get("status");
  if (typeof status !== "string" || !quoteStatusValues.includes(status as QuoteStatus)) {
    redirect(`/admin/sites/${siteId}/forfragningar/${quoteId}?error=status`);
  }

  const [row] = await db
    .update(quoteRequests)
    .set({ status: status as QuoteStatus, updatedAt: new Date() })
    .where(and(eq(quoteRequests.id, quoteId), eq(quoteRequests.siteId, siteId)))
    .returning({ name: quoteRequests.name });

  if (row) {
    await logActivity({
      userId: user.id,
      userEmail: user.email,
      siteId,
      action: "quotes.status",
      detail: `Markerade förfrågan från ${row.name} som ${STATUS_LABELS[status as QuoteStatus]}`,
    });
  }

  revalidatePath(`/admin/sites/${siteId}/forfragningar`, "layout");
  redirect(`/admin/sites/${siteId}/forfragningar/${quoteId}?saved=1`);
}

/** Permanently deletes a request (e.g. when the customer asks to be forgotten), including its attachment blobs. */
export async function deleteQuote(siteId: string, quoteId: string): Promise<void> {
  const user = await requireSiteAccess(siteId);
  const [row] = await db
    .delete(quoteRequests)
    .where(and(eq(quoteRequests.id, quoteId), eq(quoteRequests.siteId, siteId)))
    .returning({ name: quoteRequests.name, attachments: quoteRequests.attachments });

  if (row) {
    await deleteAttachmentBlobs(row.attachments);
    await logActivity({
      userId: user.id,
      userEmail: user.email,
      siteId,
      action: "quotes.delete",
      detail: `Raderade förfrågan från ${row.name}`,
    });
  }
  revalidatePath(`/admin/sites/${siteId}/forfragningar`, "layout");
  redirect(`/admin/sites/${siteId}/forfragningar?deleted=1`);
}
