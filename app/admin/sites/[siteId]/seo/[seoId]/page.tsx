import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { db, seoMeta, sites } from "@/lib/db";
import { requireSiteAccess } from "@/lib/guard";
import { updateSeoMeta, deleteSeoMeta } from "@/lib/actions/seo";
import { displayDomain } from "@/lib/site-url";
import { ConfirmButton } from "@/components/content/ConfirmButton";
import { SeoForm } from "@/components/content/SeoForm";
import { PageHeader, buttonClassName } from "@/components/ui";

export default async function EditSeoPage({
  params,
}: {
  params: Promise<{ siteId: string; seoId: string }>;
}) {
  const { siteId, seoId } = await params;
  await requireSiteAccess(siteId);

  const [[entry], [site]] = await Promise.all([
    db
      .select()
      .from(seoMeta)
      .where(and(eq(seoMeta.id, seoId), eq(seoMeta.siteId, siteId)))
      .limit(1),
    db.select({ name: sites.name, domain: sites.domain }).from(sites).where(eq(sites.id, siteId)).limit(1),
  ]);

  if (!entry) {
    notFound();
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={`SEO: ${entry.pageSlug}`}
        description="Styr hur sidan visas i Google och när den delas i sociala medier."
        breadcrumbs={[{ label: "SEO", href: `/admin/sites/${siteId}/seo` }, { label: entry.pageSlug }]}
        actions={
          // Eget formulär, utanför SEO-formuläret (det ska bara ha en submit-knapp).
          <form action={deleteSeoMeta.bind(null, siteId, entry.id)}>
            <ConfirmButton
              confirmText="Ta bort SEO-posten för denna sida?"
              className={buttonClassName({ variant: "danger" })}
            >
              <Trash2 aria-hidden className="size-4" />
              Ta bort
            </ConfirmButton>
          </form>
        }
      />

      <SeoForm
        action={updateSeoMeta.bind(null, siteId, entry.id)}
        pageSlug={entry.pageSlug}
        domain={displayDomain(site?.domain)}
        siteName={site?.name ?? ""}
        initialTitle={entry.title ?? ""}
        initialDescription={entry.description ?? ""}
        initialOgImage={entry.ogImage ?? ""}
      />
    </div>
  );
}
