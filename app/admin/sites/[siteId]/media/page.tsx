import { desc, eq } from "drizzle-orm";
import { db, media } from "@/lib/db";
import { requireSiteAccess } from "@/lib/guard";
import MediaGrid, { type MediaItemDTO } from "@/components/admin/MediaGrid";

export default async function MediaPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  await requireSiteAccess(siteId);

  const rows = await db
    .select()
    .from(media)
    .where(eq(media.siteId, siteId))
    .orderBy(desc(media.createdAt));

  const items: MediaItemDTO[] = rows.map((row) => ({
    id: row.id,
    url: row.url,
    filename: row.filename,
    contentType: row.contentType,
    size: row.size,
    createdAt: row.createdAt.toISOString(),
  }));

  return <MediaGrid siteId={siteId} items={items} />;
}
