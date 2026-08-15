import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, posts } from "@/lib/db";
import { requireSiteAccess } from "@/lib/guard";

function formatDate(date: Date | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default async function PostsPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  await requireSiteAccess(siteId);

  const rows = await db
    .select()
    .from(posts)
    .where(eq(posts.siteId, siteId))
    .orderBy(desc(posts.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Inlägg</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Nyheter och blogginlägg som visas på din sajt.
          </p>
        </div>
        <Link
          href={`/admin/sites/${siteId}/posts/new`}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Nytt inlägg
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
          Inga inlägg ännu. Klicka på &quot;Nytt inlägg&quot; för att skapa ditt första.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <ul className="divide-y divide-neutral-200">
            {rows.map((post) => (
              <li key={post.id}>
                <Link
                  href={`/admin/sites/${siteId}/posts/${post.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-neutral-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-neutral-900">
                      {post.title || "(Utan titel)"}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {post.published && post.publishedAt
                        ? `Publicerad ${formatDate(post.publishedAt)}`
                        : `Skapad ${formatDate(post.createdAt)}`}
                    </p>
                  </div>
                  <span
                    className={
                      post.published
                        ? "shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800"
                        : "shrink-0 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600"
                    }
                  >
                    {post.published ? "Publicerad" : "Utkast"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
