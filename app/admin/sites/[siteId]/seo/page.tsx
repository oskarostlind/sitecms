import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, seoMeta } from "@/lib/db";
import { requireSiteAccess } from "@/lib/guard";
import { createSeoMeta } from "@/lib/actions/seo";

export default async function SeoListPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  await requireSiteAccess(siteId);

  const rows = await db.select().from(seoMeta).where(eq(seoMeta.siteId, siteId));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">SEO</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Titel och beskrivning som visas i Google för varje sida på sajten.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
          Ingen SEO-information ännu. Lägg till en post nedan.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((entry) => {
            const titleLength = entry.title?.length ?? 0;
            const descriptionLength = entry.description?.length ?? 0;

            return (
              <Link
                key={entry.id}
                href={`/admin/sites/${siteId}/seo/${entry.id}`}
                className="block rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm hover:bg-neutral-50"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-neutral-900">{entry.pageSlug}</p>
                  <div className="flex gap-3 text-xs">
                    <span className={titleLength > 60 ? "font-medium text-red-600" : "text-neutral-400"}>
                      Titel {titleLength}/60
                    </span>
                    <span className={descriptionLength > 160 ? "font-medium text-red-600" : "text-neutral-400"}>
                      Beskrivning {descriptionLength}/160
                    </span>
                  </div>
                </div>
                <p className="mt-1 truncate text-sm text-neutral-600">
                  {entry.title || "Ingen titel angiven ännu"}
                </p>
                <p className="mt-0.5 truncate text-xs text-neutral-400">
                  {entry.description || "Ingen beskrivning angiven ännu"}
                </p>
              </Link>
            );
          })}
        </div>
      )}

      <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-medium text-neutral-900">Lägg till SEO för fler sidor</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Ange sidans slug, t.ex. &quot;om-oss&quot; eller &quot;kontakt&quot;.
        </p>
        <form action={createSeoMeta.bind(null, siteId)} className="mt-3 flex flex-wrap items-center gap-2">
          <input
            name="pageSlug"
            type="text"
            required
            placeholder="sid-slug"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Lägg till
          </button>
        </form>
      </div>
    </div>
  );
}
