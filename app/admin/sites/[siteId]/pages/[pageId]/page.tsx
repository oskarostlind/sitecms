import { Suspense } from "react";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { pages, blocks, sites } from "@/lib/db/schema";
import { requireSiteAccessWithRole } from "@/lib/guard";
import { createBlock } from "@/lib/actions/structure";
import PageBlockEditor from "@/components/admin/PageBlockEditor";
import { FlashToast } from "@/components/admin/FlashToast";
import { groupSortIndex, groupTitle } from "@/components/admin/labels";
import {
  Alert,
  ButtonLink,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
  PageHeader,
  Select,
  SubmitButton,
  fieldIds,
} from "@/components/ui";
import { siteUrl } from "@/lib/site-url";
import type { BlockDTO, BlockGroupDTO } from "@/components/admin/types";

const ERROR_MESSAGES: Record<string, string> = {
  "missing-key": "Fyll i en nyckel för fältet, t.ex. hero.title.",
  "invalid-key": "Nyckeln kan bara innehålla bokstäver a–z, siffror, punkt, bindestreck och understreck – t.ex. hero.title.",
  "invalid-type": "Välj en giltig fälttyp.",
  "key-taken": "Det finns redan ett fält med den nyckeln på sidan.",
  "field-not-found": "Fältet finns inte längre.",
};

const FLASH_MESSAGES = {
  created: { title: "Klart", description: "Ändringen i sidans struktur är sparad." },
  deleted: { title: "Fältet togs bort" },
};

export default async function PageEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string; pageId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { siteId, pageId } = await params;
  const { isOwner } = await requireSiteAccessWithRole(siteId);
  const { error } = await searchParams;

  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.id, pageId), eq(pages.siteId, siteId)))
    .limit(1);

  if (!page) notFound();

  const [site] = await db
    .select({ domain: sites.domain })
    .from(sites)
    .where(eq(sites.id, siteId))
    .limit(1);
  const siteDomain = site?.domain ?? null;

  const pageBlocks = await db
    .select()
    .from(blocks)
    .where(and(eq(blocks.pageId, pageId), eq(blocks.siteId, siteId)))
    .orderBy(asc(blocks.sortOrder), asc(blocks.createdAt));

  // Gruppordning: kända grupper (labels.ts) först, därefter i den ordning
  // grupperna dyker upp i sidans fältordning (= schema-deklarationens ordning).
  const firstSeen = new Map<string, number>();
  const groupsMap = new Map<string, BlockDTO[]>();
  for (const block of pageBlocks) {
    const dotIndex = block.key.indexOf(".");
    const prefix = dotIndex >= 0 ? block.key.slice(0, dotIndex) : block.key;
    const dto: BlockDTO = {
      id: block.id,
      key: block.key,
      type: block.type,
      value: block.value ?? "",
      alt: block.alt ?? "",
      label: block.label,
      help: block.help,
      sortOrder: block.sortOrder,
    };
    if (!groupsMap.has(prefix)) {
      groupsMap.set(prefix, []);
      firstSeen.set(prefix, firstSeen.size);
    }
    groupsMap.get(prefix)!.push(dto);
  }

  const groups: BlockGroupDTO[] = Array.from(groupsMap.entries())
    .map(([prefix, groupBlocks]) => ({
      key: prefix,
      title: groupTitle(prefix),
      blocks: groupBlocks.sort((a, b) => a.sortOrder - b.sortOrder),
    }))
    .sort(
      (a, b) =>
        groupSortIndex(a.key) - groupSortIndex(b.key) || (firstSeen.get(a.key) ?? 0) - (firstSeen.get(b.key) ?? 0),
    );

  const baseUrl = siteUrl(siteDomain);
  const pageUrl = baseUrl ? `${baseUrl}/${page.slug === "home" ? "" : page.slug}` : null;
  const fieldCount = pageBlocks.length;
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? "Något gick fel. Försök igen.") : null;

  return (
    <div>
      <Suspense fallback={null}>
        <FlashToast messages={FLASH_MESSAGES} />
      </Suspense>

      <PageHeader
        breadcrumbs={[{ label: "Sidor", href: `/admin/sites/${siteId}/pages` }, { label: page.title }]}
        title={page.title}
        description={
          page.description ? (
            <>
              <span className="block text-neutral-600">{page.description}</span>
              <span className="mt-0.5 block text-xs">
                /{page.slug} · {fieldCount} fält
              </span>
            </>
          ) : (
            `/${page.slug} · ${fieldCount} fält`
          )
        }
        actions={
          pageUrl ? (
            <ButtonLink href={pageUrl} target="_blank" rel="noopener noreferrer" variant="secondary">
              Visa sidan <span aria-hidden>↗</span>
              <span className="sr-only">(öppnas i ny flik)</span>
            </ButtonLink>
          ) : null
        }
      />

      {errorMessage ? (
        <Alert tone="danger" className="mb-6 lg:max-w-3xl">
          {errorMessage}
        </Alert>
      ) : null}

      <PageBlockEditor
        siteId={siteId}
        groups={groups}
        siteDomain={siteDomain}
        pageSlug={page.slug}
        pageId={page.id}
        canManageStructure={isOwner}
        structureSlot={isOwner ? <AddFieldCard siteId={siteId} pageId={page.id} /> : undefined}
      />
    </div>
  );
}

/** "Lägg till fält" — bara owners/admin. Server action-formulär, fungerar utan JS. */
function AddFieldCard({ siteId, pageId }: { siteId: string; pageId: string }) {
  return (
    <Card id="lagg-till-falt" className="scroll-mt-20 border-dashed">
      <CardHeader>
        <CardTitle>Lägg till fält</CardTitle>
        <CardDescription>
          Nya fält hamnar sist i sin grupp. Gruppen är delen före punkten i nyckeln – <code className="font-mono text-xs">hero.title</code> hamnar
          i gruppen &quot;hero&quot;. Kundsajten hämtar fältet med samma nyckel.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={createBlock.bind(null, siteId, pageId)} aria-label="Lägg till fält" className="grid gap-3 sm:grid-cols-2">
          <Field htmlFor="new-field-key" label="Nyckel" required hint="T.ex. hero.title eller kontakt.telefon.">
            <Input
              id="new-field-key"
              name="key"
              type="text"
              required
              placeholder="grupp.namn"
              pattern="[a-zA-Z0-9][a-zA-Z0-9._\-]*"
              maxLength={100}
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
              aria-describedby={fieldIds("new-field-key").hintId}
            />
          </Field>
          <Field htmlFor="new-field-type" label="Typ">
            <Select id="new-field-type" name="type" defaultValue="text">
              <option value="text">Text</option>
              <option value="richtext">Formaterad text</option>
              <option value="image">Bild</option>
            </Select>
          </Field>
          <Field htmlFor="new-field-label" label="Etikett" hint="Det redaktören ser ovanför fältet, t.ex. Rubrik.">
            <Input
              id="new-field-label"
              name="label"
              type="text"
              maxLength={200}
              aria-describedby={fieldIds("new-field-label").hintId}
            />
          </Field>
          <Field htmlFor="new-field-help" label="Hjälptext" hint="Valfri, t.ex. Max 60 tecken.">
            <Input
              id="new-field-help"
              name="help"
              type="text"
              maxLength={1000}
              aria-describedby={fieldIds("new-field-help").hintId}
            />
          </Field>
          <div className="sm:col-span-2">
            <SubmitButton variant="secondary" icon={<Plus />} pendingText="Lägger till…">
              Lägg till fält
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
