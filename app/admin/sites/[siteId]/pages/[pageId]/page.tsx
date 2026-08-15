import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pages, blocks } from "@/lib/db/schema";
import { requireSiteAccess } from "@/lib/guard";
import PageBlockEditor from "@/components/admin/PageBlockEditor";
import { groupSortIndex, groupTitle } from "@/components/admin/labels";
import type { BlockDTO, BlockGroupDTO } from "@/components/admin/types";

export default async function PageEditorPage({
  params,
}: {
  params: Promise<{ siteId: string; pageId: string }>;
}) {
  const { siteId, pageId } = await params;
  await requireSiteAccess(siteId);

  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.id, pageId), eq(pages.siteId, siteId)))
    .limit(1);

  if (!page) notFound();

  const pageBlocks = await db
    .select()
    .from(blocks)
    .where(and(eq(blocks.pageId, pageId), eq(blocks.siteId, siteId)))
    .orderBy(asc(blocks.sortOrder));

  const groupsMap = new Map<string, BlockDTO[]>();
  for (const block of pageBlocks) {
    const dotIndex = block.key.indexOf(".");
    const prefix = dotIndex >= 0 ? block.key.slice(0, dotIndex) : block.key;
    const dto: BlockDTO = {
      id: block.id,
      key: block.key,
      type: block.type,
      value: block.value ?? "",
      sortOrder: block.sortOrder,
    };
    if (!groupsMap.has(prefix)) groupsMap.set(prefix, []);
    groupsMap.get(prefix)!.push(dto);
  }

  const groups: BlockGroupDTO[] = Array.from(groupsMap.entries())
    .map(([prefix, groupBlocks]) => ({
      key: prefix,
      title: groupTitle(prefix),
      blocks: groupBlocks.sort((a, b) => a.sortOrder - b.sortOrder),
    }))
    .sort((a, b) => groupSortIndex(a.key) - groupSortIndex(b.key));

  return (
    <div>
      <div className="mb-6">
        <a
          href={`/admin/sites/${siteId}/pages`}
          className="text-sm text-neutral-500 hover:text-neutral-800"
        >
          ← Alla sidor
        </a>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-neutral-900">
          {page.title}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">/{page.slug}</p>
      </div>

      <PageBlockEditor siteId={siteId} groups={groups} />
    </div>
  );
}
