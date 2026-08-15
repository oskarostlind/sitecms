import { requireSiteAccess } from "@/lib/guard";
import { savePost } from "@/lib/actions/posts";
import { PostForm } from "@/components/content/PostForm";

export default async function NewPostPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  await requireSiteAccess(siteId);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Nytt inlägg</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Fyll i informationen nedan och klicka på Spara.
        </p>
      </div>
      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <PostForm siteId={siteId} action={savePost} post={null} />
      </div>
    </div>
  );
}
