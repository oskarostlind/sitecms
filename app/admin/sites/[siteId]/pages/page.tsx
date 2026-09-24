import Link from "next/link";
import { asc, count, eq, max } from "drizzle-orm";
import { ChevronRight, FileText } from "lucide-react";
import { db } from "@/lib/db";
import { pages, blocks } from "@/lib/db/schema";
import { requireSiteAccess } from "@/lib/guard";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { formatDateTime, relativeTime } from "@/lib/format";

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

  const blockStats = await db
    .select({
      pageId: blocks.pageId,
      count: count(),
      lastUpdated: max(blocks.updatedAt),
    })
    .from(blocks)
    .where(eq(blocks.siteId, siteId))
    .groupBy(blocks.pageId);

  const statsByPage = new Map(blockStats.map((row) => [row.pageId, row]));

  return (
    <div>
      <PageHeader title="Sidor" description="Välj en sida för att redigera dess texter och bilder." />

      {sitePages.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title="Inga sidor ännu"
          description="Sidor läggs upp av din leverantör när sajten kopplas."
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-neutral-200">
            {sitePages.map((page) => {
              const stats = statsByPage.get(page.id);
              const fieldCount = stats?.count ?? 0;
              const lastUpdated = stats?.lastUpdated ?? null;
              return (
                <li key={page.id}>
                  <Link
                    href={`/admin/sites/${siteId}/pages/${page.id}`}
                    className="group flex items-center gap-4 px-5 py-4 transition-colors duration-150 hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/50 sm:px-6"
                  >
                    <span
                      aria-hidden
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500"
                    >
                      <FileText className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-neutral-900">{page.title}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-neutral-500">
                        <span className="truncate">/{page.slug}</span>
                        {lastUpdated ? (
                          <>
                            <span aria-hidden className="text-neutral-300">
                              ·
                            </span>
                            <span title={formatDateTime(lastUpdated)}>Uppdaterad {relativeTime(lastUpdated)}</span>
                          </>
                        ) : null}
                      </span>
                    </span>
                    <Badge tone="neutral">
                      {fieldCount} fält
                    </Badge>
                    <ChevronRight
                      aria-hidden
                      className="size-4 shrink-0 text-neutral-400 transition-colors duration-150 group-hover:text-neutral-600"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
