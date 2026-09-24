import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { db, posts } from "@/lib/db";
import { requireSiteAccess } from "@/lib/guard";
import { savePost, deletePost } from "@/lib/actions/posts";
import { PostForm } from "@/components/content/PostForm";
import { ConfirmButton } from "@/components/content/ConfirmButton";
import { PageHeader, buttonClassName } from "@/components/ui";

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
    <div>
      <PageHeader
        title={post.title || "(Utan titel)"}
        description="Ändringar syns på sajten så snart du sparar. Tar du bort inlägget kan du lägga tillbaka det från aktivitetsloggen."
        breadcrumbs={[
          { label: "Inlägg", href: `/admin/sites/${siteId}/posts` },
          { label: post.title || "(Utan titel)" },
        ]}
        actions={
          // Eget formulär, utanför inläggsformuläret (det ska bara ha en submit-knapp).
          <form action={deletePost.bind(null, siteId, post.id)}>
            <ConfirmButton
              confirmText="Ta bort inlägget? Du kan lägga tillbaka det från aktivitetsloggen efteråt."
              className={buttonClassName({ variant: "danger" })}
            >
              <Trash2 aria-hidden className="size-4" />
              Ta bort
            </ConfirmButton>
          </form>
        }
      />
      <PostForm siteId={siteId} action={savePost} post={post} />
    </div>
  );
}
