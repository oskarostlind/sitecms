import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, seoMeta } from "@/lib/db";
import { requireSiteAccess } from "@/lib/guard";
import { updateSeoMeta, deleteSeoMeta } from "@/lib/actions/seo";
import { CharCounterField } from "@/components/content/CharCounterField";
import { ConfirmButton } from "@/components/content/ConfirmButton";

export default async function EditSeoPage({
  params,
}: {
  params: Promise<{ siteId: string; seoId: string }>;
}) {
  const { siteId, seoId } = await params;
  await requireSiteAccess(siteId);

  const [entry] = await db
    .select()
    .from(seoMeta)
    .where(and(eq(seoMeta.id, seoId), eq(seoMeta.siteId, siteId)))
    .limit(1);

  if (!entry) {
    notFound();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">SEO: {entry.pageSlug}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Styr hur sidan visas i Google och när den delas i sociala medier.
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <form action={updateSeoMeta.bind(null, siteId, entry.id)} className="space-y-5">
          <CharCounterField
            id="title"
            name="title"
            label="Titel (visas i sökresultat)"
            defaultValue={entry.title ?? ""}
            limit={60}
            placeholder="Sidans titel för Google"
          />
          <CharCounterField
            id="description"
            name="description"
            label="Beskrivning"
            defaultValue={entry.description ?? ""}
            limit={160}
            multiline
            placeholder="Kort beskrivning som visas under titeln i sökresultat"
          />
          <div>
            <label htmlFor="ogImage" className="block text-sm font-medium text-neutral-700">
              Delningsbild (URL)
            </label>
            <input
              id="ogImage"
              name="ogImage"
              type="text"
              defaultValue={entry.ogImage ?? ""}
              placeholder="https://..."
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Spara
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-red-100 bg-white p-6">
        <h2 className="text-sm font-medium text-neutral-900">Ta bort SEO-post</h2>
        <p className="mt-1 text-sm text-neutral-500">Detta går inte att ångra.</p>
        <form action={deleteSeoMeta.bind(null, siteId, entry.id)} className="mt-3">
          <ConfirmButton
            confirmText="Ta bort SEO-posten för denna sida?"
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Ta bort
          </ConfirmButton>
        </form>
      </div>
    </div>
  );
}
