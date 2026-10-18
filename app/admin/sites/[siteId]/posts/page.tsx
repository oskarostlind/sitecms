import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ChevronRight, Image as ImageIcon, Newspaper, Plus } from "lucide-react";
import { db, posts } from "@/lib/db";
import { requireSiteAccess } from "@/lib/guard";
import { formatDate, formatDateTime, relativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Badge, ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";

type StatusFilter = "all" | "published" | "draft";

function parseStatus(value: string | string[] | undefined): StatusFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "published" || raw === "draft" ? raw : "all";
}

export default async function PostsPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const { siteId } = await params;
  const { status: statusParam } = await searchParams;
  await requireSiteAccess(siteId);

  const status = parseStatus(statusParam);
  const basePath = `/admin/sites/${siteId}/posts`;

  const rows = await db
    .select()
    .from(posts)
    .where(eq(posts.siteId, siteId))
    .orderBy(desc(posts.createdAt));

  const publishedCount = rows.filter((post) => post.published).length;
  const draftCount = rows.length - publishedCount;
  const visible =
    status === "published"
      ? rows.filter((post) => post.published)
      : status === "draft"
        ? rows.filter((post) => !post.published)
        : rows;

  const filters: { value: StatusFilter; label: string; count: number; href: string }[] = [
    { value: "all", label: "Alla", count: rows.length, href: basePath },
    { value: "published", label: "Publicerade", count: publishedCount, href: `${basePath}?status=published` },
    { value: "draft", label: "Utkast", count: draftCount, href: `${basePath}?status=draft` },
  ];

  return (
    <div>
      <PageHeader
        title="Inlägg"
        description="Nyheter och blogginlägg som visas på din sajt."
        actions={
          <ButtonLink href={`${basePath}/new`} icon={<Plus />}>
            Nytt inlägg
          </ButtonLink>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Newspaper />}
          title="Inga inlägg ännu"
          description="Skriv nyheter och uppdateringar som visas på din sajt."
          action={
            <ButtonLink href={`${basePath}/new`} icon={<Plus />}>
              Skriv ditt första inlägg
            </ButtonLink>
          }
        />
      ) : (
        <div className="space-y-4">
          <nav aria-label="Filtrera inlägg" className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const active = filter.value === status;
              return (
                <Link
                  key={filter.value}
                  href={filter.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2",
                    active
                      ? "border-brand-200 bg-brand-50 text-brand-700"
                      : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900",
                  )}
                >
                  {filter.label}
                  <span className={cn("tabular-nums", active ? "text-brand-700" : "text-neutral-500")}>
                    ({filter.count})
                  </span>
                </Link>
              );
            })}
          </nav>

          {visible.length === 0 ? (
            <EmptyState
              icon={<Newspaper />}
              title={status === "published" ? "Inga publicerade inlägg" : "Inga utkast"}
              description={
                status === "published"
                  ? "Öppna ett utkast och bocka i Publicerad för att visa det på sajten."
                  : "Alla dina inlägg är publicerade."
              }
            />
          ) : (
            <Card className="overflow-hidden">
              <ul className="divide-y divide-neutral-200">
                {visible.map((post) => (
                  <li key={post.id}>
                    <Link
                      href={`${basePath}/${post.id}`}
                      className="flex items-center gap-4 px-4 py-3 transition-colors duration-150 hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/50 sm:px-5"
                    >
                      {post.coverImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.coverImage}
                          alt=""
                          loading="lazy"
                          className="size-12 shrink-0 rounded-md bg-neutral-100 object-cover"
                        />
                      ) : (
                        <span
                          aria-hidden
                          className="flex size-12 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-400"
                        >
                          <ImageIcon className="size-5" />
                        </span>
                      )}

                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate font-medium",
                            post.title ? "text-neutral-900" : "italic text-neutral-500",
                          )}
                        >
                          {post.title || "(Utan titel)"}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-neutral-500">
                          {post.published ? (
                            post.publishedAt ? (
                              <span title={formatDateTime(post.publishedAt)}>
                                Publicerad {formatDate(post.publishedAt)}
                              </span>
                            ) : (
                              "Publicerad"
                            )
                          ) : (
                            <span title={formatDateTime(post.updatedAt)}>
                              Utkast · uppdaterad {relativeTime(post.updatedAt)}
                            </span>
                          )}
                        </p>
                      </div>

                      <Badge tone={post.published ? "success" : "neutral"} className="shrink-0">
                        {post.published ? "Publicerad" : "Utkast"}
                      </Badge>
                      <ChevronRight aria-hidden className="size-4 shrink-0 text-neutral-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
