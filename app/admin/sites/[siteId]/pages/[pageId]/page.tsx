import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pages, blocks, sites } from "@/lib/db/schema";
import { requireSiteAccess } from "@/lib/guard";
import PageBlockEditor from "@/components/admin/PageBlockEditor";
import { groupSortIndex, groupTitle } from "@/components/admin/labels";
import { ButtonLink, PageHeader } from "@/components/ui";
import { siteUrl } from "@/lib/site-url";
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

  const [site] = await db
    .select({ domain: sites.domain })
    .from(sites)
    .where(eq(sites.id, siteId))
    .limit(1);
  const siteDomain = site?.domain ?? null;

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
      alt: block.alt ?? "",
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

  const baseUrl = siteUrl(siteDomain);
  const pageUrl = baseUrl ? `${baseUrl}/${page.slug === "home" ? "" : page.slug}` : null;
  const fieldCount = pageBlocks.length;

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Sidor", href: `/admin/sites/${siteId}/pages` }, { label: page.title }]}
        title={page.title}
        description={`/${page.slug} · ${fieldCount} fält`}
        actions={
          pageUrl ? (
            <ButtonLink
              href={pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="secondary"
            >
              Visa sidan <span aria-hidden>↗</span>
              <span className="sr-only">(öppnas i ny flik)</span>
            </ButtonLink>
          ) : null
        }
      />

      <PageBlockEditor siteId={siteId} groups={groups} siteDomain={siteDomain} pageSlug={page.slug} />
    </div>
  );
}
