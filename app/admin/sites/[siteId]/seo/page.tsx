import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { Plus, Search } from "lucide-react";
import { db, seoMeta, sites } from "@/lib/db";
import { requireSiteAccess } from "@/lib/guard";
import { createSeoMeta } from "@/lib/actions/seo";
import { displayDomain } from "@/lib/site-url";
import { cn } from "@/lib/cn";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  Input,
  PageHeader,
  SubmitButton,
} from "@/components/ui";

const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 160;

function lengthTone(length: number, limit: number) {
  return length > 0 && length <= limit ? "success" : "warning";
}

export default async function SeoListPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  await requireSiteAccess(siteId);

  const [rows, [site]] = await Promise.all([
    db.select().from(seoMeta).where(eq(seoMeta.siteId, siteId)).orderBy(asc(seoMeta.pageSlug)),
    db.select({ name: sites.name, domain: sites.domain }).from(sites).where(eq(sites.id, siteId)).limit(1),
  ]);

  const host = displayDomain(site?.domain) || "din-sajt.se";
  const siteName = site?.name ?? "";
  const initial = (siteName.trim()[0] ?? host[0] ?? "?").toUpperCase();

  return (
    <div className="space-y-6">
      <PageHeader title="SEO" description="Titel och beskrivning som visas i Google för varje sida." />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Search />}
          title="Ingen SEO-information ännu"
          description="Lägg till en sida nedan för att styra hur den visas i Google."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((entry) => {
            const title = entry.title?.trim() ?? "";
            const description = entry.description?.trim() ?? "";
            const path = entry.pageSlug.replace(/^\/+/, "");

            return (
              <li key={entry.id}>
                <Link
                  href={`/admin/sites/${siteId}/seo/${entry.id}`}
                  className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2"
                >
                  <Card interactive className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden
                          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-600 ring-1 ring-neutral-200"
                        >
                          {initial}
                        </span>
                        <p className="min-w-0 truncate text-xs text-neutral-500">
                          https://{host}
                          {path ? ` › ${path}` : ""}
                        </p>
                      </div>
                      <p
                        className={cn(
                          "mt-2 truncate text-base",
                          title ? "text-brand-700" : "italic text-neutral-400",
                        )}
                      >
                        {title || "Ingen titel angiven ännu"}
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 line-clamp-2 text-sm",
                          description ? "text-neutral-600" : "italic text-neutral-400",
                        )}
                      >
                        {description || "Ingen beskrivning angiven ännu"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-end">
                      <Badge tone={lengthTone(title.length, TITLE_LIMIT)}>
                        Titel {title.length}/{TITLE_LIMIT}
                      </Badge>
                      <Badge tone={lengthTone(description.length, DESCRIPTION_LIMIT)}>
                        Beskrivning {description.length}/{DESCRIPTION_LIMIT}
                      </Badge>
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lägg till SEO för fler sidor</CardTitle>
          <CardDescription>
            Ange sidans adress utan snedstreck och domän, t.ex. &quot;om-oss&quot; eller &quot;kontakt&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createSeoMeta.bind(null, siteId)} className="flex flex-wrap items-end gap-3">
            <Field htmlFor="pageSlug" label="Sidans adress" className="min-w-0 flex-1 basis-60">
              <Input
                id="pageSlug"
                name="pageSlug"
                type="text"
                required
                placeholder="om-oss"
              />
            </Field>
            <SubmitButton icon={<Plus />} pendingText="Lägger till…">
              Lägg till
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
