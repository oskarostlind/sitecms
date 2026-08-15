import { notFound } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { sites, pages, blocks, services } from "@/lib/db/schema";
import { requireSiteAccess } from "@/lib/guard";

function formatDate(date: Date | string | null) {
  if (!date) return "Aldrig";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export default async function SiteOverviewPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  await requireSiteAccess(siteId);

  const [site] = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1);
  if (!site) notFound();

  const [[pagesCountRow], [blocksCountRow], [servicesCountRow], [lastBlockUpdateRow]] =
    await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(pages)
        .where(eq(pages.siteId, siteId)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(blocks)
        .where(eq(blocks.siteId, siteId)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(services)
        .where(eq(services.siteId, siteId)),
      db
        .select({ max: sql<Date | null>`max(${blocks.updatedAt})` })
        .from(blocks)
        .where(eq(blocks.siteId, siteId)),
    ]);

  const lastUpdated =
    lastBlockUpdateRow?.max && new Date(lastBlockUpdateRow.max) > new Date(site.updatedAt)
      ? lastBlockUpdateRow.max
      : site.updatedAt;

  const stats = [
    { label: "Sidor", value: pagesCountRow?.count ?? 0 },
    { label: "Innehållsblock", value: blocksCountRow?.count ?? 0 },
    { label: "Tjänster", value: servicesCountRow?.count ?? 0 },
  ];

  const quickLinks = [
    { label: "Redigera sidor", href: `/admin/sites/${siteId}/pages` },
    { label: "Inlägg", href: `/admin/sites/${siteId}/posts` },
    { label: "Tjänster & priser", href: `/admin/sites/${siteId}/services` },
    { label: "SEO", href: `/admin/sites/${siteId}/seo` },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
        {site.name}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        {site.domain ?? "Ingen domän angiven"}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
          >
            <div className="text-2xl font-semibold text-neutral-900">
              {stat.value}
            </div>
            <div className="mt-1 text-sm text-neutral-500">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="text-sm text-neutral-500">Senast uppdaterad</div>
        <div className="mt-1 text-sm font-medium text-neutral-900">
          {formatDate(lastUpdated)}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-medium text-neutral-900">Snabblänkar</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {quickLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-sm font-medium text-neutral-900 shadow-sm transition-shadow hover:shadow-md"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
