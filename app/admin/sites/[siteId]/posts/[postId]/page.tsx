import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, posts } from "@/lib/db";
import { requireSiteAccess } from "@/lib/guard";
import { savePost, deletePost } from "@/lib/actions/posts";
import { PostForm } from "@/components/content/PostForm";
import { ConfirmButton } from "@/components/content/ConfirmButton";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ siteId: string; postId: string }>;
}) {
  const { siteId, postId } = await params;
  await requireSiteAccess(siteId);

  const [post] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.siteId, siteId)))
    .limit(1);

  if (!post) {
    notFound();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Redigera inlägg</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Ändringar syns på sajten så snart du sparar.
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <PostForm siteId={siteId} action={savePost} post={post} />
      </div>

      <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-neutral-900">Ta bort inlägg</h2>
        <p className="mt-1 text-sm text-neutral-500">Detta går inte att ångra.</p>
        <form action={deletePost.bind(null, siteId, post.id)} className="mt-3">
          <ConfirmButton
            confirmText="Ta bort inlägget? Detta går inte att ångra."
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Ta bort inlägg
          </ConfirmButton>
        </form>
      </div>
    </div>
  );
}
