"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, seoMeta } from "@/lib/db";
import { requireSiteAccess, requireSiteOwner } from "@/lib/guard";
import { triggerSiteRevalidation } from "@/lib/revalidate";
import { logActivity } from "@/lib/audit";
import { getTodaySeoScoreRow, runSeoScore } from "@/lib/seo-score";

/** Minsta tid mellan två manuella omräkningar per sajt (docs/SEO-TRAFIK.md §6). */
const SCORE_RUN_COOLDOWN_MS = 10 * 60 * 1000;

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
  const user = await requireSiteAccess(siteId);

  const pageSlug = readString(formData, "pageSlug");
  if (!pageSlug) {
    throw new Error("Sidans slug krävs.");
  }

  const [created] = await db
    .insert(seoMeta)
    .values({ siteId, pageSlug, title: "", description: "", ogImage: "" })
    .returning({ id: seoMeta.id });

  await afterChange(siteId);
  await logActivity({
    userId: user.id,
    userEmail: user.email,
    siteId,
    action: "seo.create",
    detail: `Lade till SEO-inställningar för /${pageSlug}`,
  });
  redirect(`/admin/sites/${siteId}/seo/${created.id}`);
}

export async function updateSeoMeta(
  siteId: string,
  seoId: string,
  formData: FormData,
): Promise<void> {
  const user = await requireSiteAccess(siteId);

  const title = readString(formData, "title") || null;
  const description = readString(formData, "description") || null;
  const ogImage = readString(formData, "ogImage") || null;

  const [existing] = await db
    .select({ pageSlug: seoMeta.pageSlug })
    .from(seoMeta)
    .where(and(eq(seoMeta.id, seoId), eq(seoMeta.siteId, siteId)))
    .limit(1);

  await db
    .update(seoMeta)
    .set({ title, description, ogImage, updatedAt: new Date() })
    .where(and(eq(seoMeta.id, seoId), eq(seoMeta.siteId, siteId)));

  await afterChange(siteId);
  await logActivity({
    userId: user.id,
    userEmail: user.email,
    siteId,
    action: "seo.update",
    detail: `Uppdaterade SEO för /${existing?.pageSlug ?? "okänd sida"}`,
  });
  redirect(`/admin/sites/${siteId}/seo`);
}

export async function deleteSeoMeta(siteId: string, seoId: string): Promise<void> {
  const user = await requireSiteAccess(siteId);

  const [existing] = await db
    .select({ pageSlug: seoMeta.pageSlug })
    .from(seoMeta)
    .where(and(eq(seoMeta.id, seoId), eq(seoMeta.siteId, siteId)))
    .limit(1);

  await db.delete(seoMeta).where(and(eq(seoMeta.id, seoId), eq(seoMeta.siteId, siteId)));

  await afterChange(siteId);
  if (existing) {
    await logActivity({
      userId: user.id,
      userEmail: user.email,
      siteId,
      action: "seo.delete",
      detail: `Tog bort SEO-inställningar för /${existing.pageSlug}`,
    });
  }
  redirect(`/admin/sites/${siteId}/seo`);
}

/**
 * "Räkna om"-knappen på SEO & Trafik. Owner eller admin (admin räknas som
 * owner i requireSiteOwner). Max en körning per 10 min och sajt: är dagens
 * rad nyare än så körs inget och sidan laddas om med `?score=recent`.
 * Annars körs runSeoScore (inkl. PageSpeed, upp till 60 s), loggas som
 * `seo.score.run` och sidan laddas om med `?score=ok`. Ett fel i körningen
 * ger `?score=failed` i stället för en felsida.
 */
export async function runSeoScoreNow(siteId: string): Promise<void> {
  const user = await requireSiteOwner(siteId);
  const target = `/admin/sites/${siteId}/seo`;

  const today = await getTodaySeoScoreRow(siteId);
  if (today && Date.now() - today.updatedAt.getTime() < SCORE_RUN_COOLDOWN_MS) {
    redirect(`${target}?score=recent`);
  }

  let status: "ok" | "failed" = "ok";
  try {
    const result = await runSeoScore(siteId);
    await logActivity({
      userId: user.id,
      userEmail: user.email,
      siteId,
      action: "seo.score.run",
      detail:
        result.lighthouseScore === null
          ? `Räknade om SEO-poängen: ${result.score} av 100 (innehåll ${result.contentScore}, ingen Google-mätning)`
          : `Räknade om SEO-poängen: ${result.score} av 100 (innehåll ${result.contentScore}, Google ${result.lighthouseScore})`,
    });
  } catch (err) {
    console.error(`runSeoScoreNow: misslyckades för sajt ${siteId}`, err);
    status = "failed";
  }

  revalidatePath(target);
  revalidatePath(`/admin/sites/${siteId}`);
  redirect(`${target}?score=${status}`);
}
