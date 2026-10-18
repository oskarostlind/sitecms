import { Suspense } from "react";
import Link from "next/link";
import { asc, count, eq, max } from "drizzle-orm";
import { ChevronRight, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { pages, blocks } from "@/lib/db/schema";
import { requireSiteAccessWithRole } from "@/lib/guard";
import { createPage, deletePage, renamePage } from "@/lib/actions/structure";
import { ConfirmButton } from "@/components/content/ConfirmButton";
import { FlashToast } from "@/components/admin/FlashToast";
import {
  Alert,
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
  fieldIds,
} from "@/components/ui";
import { formatDateTime, relativeTime } from "@/lib/format";

const ERROR_MESSAGES: Record<string, string> = {
  "missing-title": "Fyll i en titel för sidan.",
  "invalid-slug": "Adressen kan bara innehålla a–z, 0–9 och bindestreck.",
  "slug-taken": "Det finns redan en sida med den adressen. Välj en annan.",
  "not-found": "Sidan finns inte längre.",
};

const FLASH_MESSAGES = {
  saved: { title: "Sidan har sparats" },
  deleted: { title: "Sidan togs bort" },
};

export default async function PagesListPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { siteId } = await params;
  const { isOwner } = await requireSiteAccessWithRole(siteId);
  const { error } = await searchParams;

  const sitePages = await db
    .select()
    .from(pages)
    .where(eq(pages.siteId, siteId))
    .orderBy(asc(pages.sortOrder), asc(pages.createdAt));

  const blockStats = await db
    .select({
      pageId: blocks.pageId,
      count: count(),
      lastUpdated: max(blocks.updatedAt),
    })
    .from(blocks)
    .where(eq(blocks.siteId, siteId))
    .groupBy(blocks.pageId);

  const statsByPage = new Map(blockStats.map((row) => [row.pageId, row]));
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? "Något gick fel. Försök igen.") : null;

  return (
    <div>
      <Suspense fallback={null}>
        <FlashToast messages={FLASH_MESSAGES} />
      </Suspense>

      <PageHeader
        title="Sidor"
        description={
          isOwner
            ? "Välj en sida för att redigera dess texter och bilder, eller lägg till och ändra sidor."
            : "Välj en sida för att redigera dess texter och bilder."
        }
      />

      {errorMessage ? (
        <Alert tone="danger" className="mb-6">
          {errorMessage}
        </Alert>
      ) : null}

      {sitePages.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title="Inga sidor ännu"
          description={
            isOwner
              ? "Skapa en sida nedan, eller låt kundsajten deklarera sina sidor med schema-sync."
              : "Sidor läggs upp av din leverantör när sajten kopplas."
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-neutral-200">
            {sitePages.map((page) => {
              const stats = statsByPage.get(page.id);
              const fieldCount = stats?.count ?? 0;
              const lastUpdated = stats?.lastUpdated ?? null;
              return (
                <li key={page.id}>
                  <div className="flex items-stretch">
                    <Link
                      href={`/admin/sites/${siteId}/pages/${page.id}`}
                      className="group flex min-w-0 flex-1 items-center gap-4 px-5 py-4 transition-colors duration-150 hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/50 sm:px-6"
                    >
                      <span
                        aria-hidden
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500"
                      >
                        <FileText className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-neutral-900">{page.title}</span>
                        {page.description ? (
                          <span className="mt-0.5 block truncate text-sm text-neutral-600">{page.description}</span>
                        ) : null}
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-neutral-500">
                          <span className="truncate">/{page.slug}</span>
                          {lastUpdated ? (
                            <>
                              <span aria-hidden className="text-neutral-300">
                                ·
                              </span>
                              <span title={formatDateTime(lastUpdated)}>Uppdaterad {relativeTime(lastUpdated)}</span>
                            </>
                          ) : null}
                        </span>
                      </span>
                      <Badge tone="neutral">{fieldCount} fält</Badge>
                      <ChevronRight
                        aria-hidden
                        className="size-4 shrink-0 text-neutral-400 transition-colors duration-150 group-hover:text-neutral-600"
                      />
                    </Link>
                  </div>

                  {isOwner ? <PageManageRow siteId={siteId} page={page} fieldCount={fieldCount} /> : null}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {isOwner ? <NewPageCard siteId={siteId} /> : null}
    </div>
  );
}

/**
 * "Ändra"-rad under varje sida (bara owners): en hopfällbar inline-form för
 * namn/adress/beskrivning och en ta bort-knapp. `<details>` fungerar utan
 * JavaScript och håller listan kompakt.
 */
function PageManageRow({
  siteId,
  page,
  fieldCount,
}: {
  siteId: string;
  page: typeof pages.$inferSelect;
  fieldCount: number;
}) {
  const id = (field: string) => `page-${page.id}-${field}`;
  const deleteText =
    fieldCount > 0
      ? `Ta bort sidan "${page.title}" och dess ${fieldCount} fält? Innehållet försvinner från sajten och går inte att få tillbaka.`
      : `Ta bort sidan "${page.title}"? Detta går inte att ångra.`;

  return (
    <details className="group/manage border-t border-dashed border-neutral-200 bg-neutral-50/40">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-5 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/50 sm:px-6 [&::-webkit-details-marker]:hidden">
        <Pencil aria-hidden className="size-3.5" />
        <span className="group-open/manage:hidden">Ändra namn eller ta bort</span>
        <span className="hidden group-open/manage:inline">Stäng</span>
        <span className="sr-only"> – {page.title}</span>
      </summary>

      <div className="space-y-4 px-5 pb-5 pt-1 sm:px-6">
        <form
          action={renamePage.bind(null, siteId, page.id)}
          aria-label={`Ändra sidan ${page.title}`}
          className="grid gap-3 sm:grid-cols-2"
        >
          <Field htmlFor={id("title")} label="Titel" required>
            <Input id={id("title")} name="title" type="text" required defaultValue={page.title} maxLength={200} />
          </Field>
          <Field htmlFor={id("slug")} label="Adress (slug)" hint="Ändrar du adressen måste kundsajten använda den nya.">
            <Input
              id={id("slug")}
              name="slug"
              type="text"
              defaultValue={page.slug}
              className="font-mono"
              aria-describedby={fieldIds(id("slug")).hintId}
              maxLength={100}
            />
          </Field>
          <Field htmlFor={id("description")} label="Beskrivning" hint="Visas under sidans titel i redigeraren." className="sm:col-span-2">
            <Input
              id={id("description")}
              name="description"
              type="text"
              defaultValue={page.description ?? ""}
              placeholder="T.ex. Det besökaren ser först."
              aria-describedby={fieldIds(id("description")).hintId}
              maxLength={1000}
            />
          </Field>
          <div className="sm:col-span-2">
            <SubmitButton size="sm" pendingText="Sparar…">
              Spara
            </SubmitButton>
          </div>
        </form>

        <form action={deletePage.bind(null, siteId, page.id)} className="border-t border-neutral-200 pt-4">
          <ConfirmButton size="sm" icon={<Trash2 />} confirmText={deleteText}>
            Ta bort sidan
          </ConfirmButton>
        </form>
      </div>
    </details>
  );
}

function NewPageCard({ siteId }: { siteId: string }) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Ny sida</CardTitle>
        <CardDescription>
          Skapa en tom sida och lägg sedan till fält i redigeraren. Sidor som kundsajten deklarerar via schema-sync
          skapas automatiskt.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={createPage.bind(null, siteId)} aria-label="Ny sida" className="grid gap-3 sm:grid-cols-2">
          <Field htmlFor="new-page-title" label="Titel" required>
            <Input id="new-page-title" name="title" type="text" required placeholder="T.ex. Om oss" maxLength={200} />
          </Field>
          <Field htmlFor="new-page-slug" label="Adress (slug)" hint="Valfri – skapas från titeln om du lämnar den tom.">
            <Input
              id="new-page-slug"
              name="slug"
              type="text"
              placeholder="t.ex. om-oss"
              className="font-mono"
              aria-describedby={fieldIds("new-page-slug").hintId}
              maxLength={100}
            />
          </Field>
          <Field htmlFor="new-page-description" label="Beskrivning" hint="Valfri. Visas under sidans titel i redigeraren." className="sm:col-span-2">
            <Input
              id="new-page-description"
              name="description"
              type="text"
              aria-describedby={fieldIds("new-page-description").hintId}
              maxLength={1000}
            />
          </Field>
          <div className="sm:col-span-2">
            <SubmitButton icon={<Plus />} pendingText="Skapar…">
              Skapa sida
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
