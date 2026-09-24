import { requireSiteAccess } from "@/lib/guard";
import { savePost } from "@/lib/actions/posts";
import { PostForm } from "@/components/content/PostForm";
import { PageHeader } from "@/components/ui";

export default async function NewPostPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  await requireSiteAccess(siteId);

  return (
    <div>
      <PageHeader
        title="Nytt inlägg"
        description="Skriv inlägget och klicka på Spara. Det syns på sajten först när du bockar i Publicerad."
        breadcrumbs={[{ label: "Inlägg", href: `/admin/sites/${siteId}/posts` }, { label: "Nytt inlägg" }]}
      />
      <PostForm siteId={siteId} action={savePost} post={null} />
    </div>
  );
}
