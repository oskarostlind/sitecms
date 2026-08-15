import { eq, sql, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { pages, blocks } from "@/lib/db/schema";
import { requireSiteAccess } from "@/lib/guard";

export default async function PagesListPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  await requireSiteAccess(siteId);

  const sitePages = await db
    .select()
    .from(pages)
    .where(eq(pages.siteId, siteId))
    .orderBy(asc(pages.sortOrder));

  const blockCounts = await db
    .select({ pageId: blocks.pageId, count: sql<number>`count(*)::int` })
    .from(blocks)
    .where(eq(blocks.siteId, siteId))
    .groupBy(blocks.pageId);

  const countByPage = new Map(blockCounts.map((row) => [row.pageId, row.count]));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
            Sidor
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Välj en sida för att redigera dess innehåll.
          </p>
        </div>
      </div>

      {sitePages.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-neutral-500">Inga sidor hittades.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <ul className="divide-y divide-neutral-100">
            {sitePages.map((page) => (
              <li key={page.id}>
                <a
                  href={`/admin/sites/${siteId}/pages/${page.id}`}
                  className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-neutral-50"
                >
                  <div>
                    <div className="font-medium text-neutral-900">
                      {page.title}
                    </div>
                    <div className="mt-0.5 text-sm text-neutral-500">
                      /{page.slug}
                    </div>
                  </div>
                  <div className="text-sm text-neutral-400">
                    {countByPage.get(page.id) ?? 0} block
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
