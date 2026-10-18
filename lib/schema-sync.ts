import { asc, eq, inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { db, blocks, pages, sites } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import type { SiteSchema } from "@/lib/schema-validate";

/**
 * Schema-sync: kundsajten deklarerar sina sidor och fält, CMS:et skapar och
 * uppdaterar strukturen. Kundens innehåll vinner alltid — `value`/`alt` på ett
 * befintligt block skrivs aldrig över (bara tomma block får sitt default).
 *
 * Valideringen ligger i lib/schema-validate.ts (utan beroenden) och
 * återexporteras här så att `lib/schema-sync` är den enda ingången.
 */
export {
  validateSchema,
  SCHEMA_BLOCK_TYPES,
  SCHEMA_KEY_PATTERN,
  SCHEMA_LIMITS,
  SCHEMA_SLUG_PATTERN,
  SCHEMA_VERSION,
  type SchemaBlock,
  type SchemaBlockType,
  type SchemaPage,
  type SiteSchema,
  type ValidateSchemaResult,
} from "@/lib/schema-validate";

/** audit_logs.userId är NOT NULL utan FK — API-anrop loggas med en fast "användare". */
export const API_ACTOR = {
  userId: "00000000-0000-0000-0000-000000000000",
  userEmail: "api@sitecms",
} as const;

export type SchemaOrphan = { pageSlug: string; key: string };

export type SchemaSyncReport = {
  ok: true;
  created: { pages: number; blocks: number };
  /** Bara rader där något faktiskt ändrades räknas. */
  updated: { pages: number; blocks: number };
  /** Block i CMS:et som inte finns i deklarationen (och inte togs bort). */
  orphans: SchemaOrphan[];
  /** Sidor i CMS:et som inte finns i deklarationen (och inte togs bort). */
  orphanPages: string[];
  pruned: { pages: number; blocks: number };
  /** ISO-tid då synken skrevs (= sites.lastSchemaSyncAt). */
  syncedAt: string;
};

export type ApplySchemaOptions = {
  /** Ta bort block och sidor som inte finns i deklarationen. Default: schemats egen `prune`. */
  prune?: boolean;
  /** Vem som loggas i aktivitetsloggen. Default: API_ACTOR. */
  actor?: { userId: string; userEmail: string };
};

/** Neon HTTP-batch skickas som en request — dela upp stora insättningar. */
const INSERT_CHUNK = 500;

function isBlank(value: string | null): boolean {
  return value === null || value.trim() === "";
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** "Synkade struktur: 2 sidor skapade, 14 fält skapade, 3 uppdaterade" */
export function describeSchemaSync(report: SchemaSyncReport): string {
  const parts: string[] = [];
  if (report.created.pages) parts.push(`${plural(report.created.pages, "sida", "sidor")} skapade`);
  if (report.created.blocks) parts.push(`${report.created.blocks} fält skapade`);
  const updated = report.updated.pages + report.updated.blocks;
  if (updated) parts.push(`${updated} uppdaterade`);
  if (report.pruned.pages) parts.push(`${plural(report.pruned.pages, "sida", "sidor")} borttagna`);
  if (report.pruned.blocks) parts.push(`${report.pruned.blocks} fält borttagna`);
  const orphanCount = report.orphans.length;
  if (orphanCount) parts.push(`${orphanCount} fält finns bara i CMS:et`);
  return `Synkade struktur: ${parts.length ? parts.join(", ") : "inga ändringar"}`;
}

/**
 * Upsertar sidor och block för en sajt enligt ett validerat schema.
 *
 * - Saknade sidor/block skapas (block får `value = default`, `alt = defaultAlt`).
 * - Befintliga sidor: `title`, `description`, `sortOrder` (ordningen i deklarationen).
 * - Befintliga block: `type`, `label`, `help`, `sortOrder`. `value`/`alt` rörs
 *   inte — utom när `value` är tomt, då fylls `default` (och `defaultAlt` om
 *   alt-texten också är tom).
 * - `prune`: block som inte deklareras tas bort, liksom sidor som inte
 *   deklareras (med sina block). Annars rapporteras de som `orphans`/`orphanPages`.
 *
 * Alla skrivningar körs i en enda batch (en transaktion i Neon): antingen
 * går hela synken igenom eller ingenting. Sätter `sites.lastSchemaSyncAt`
 * och loggar `schema.sync`.
 */
export async function applySchema(
  siteId: string,
  schema: SiteSchema,
  options: ApplySchemaOptions = {},
): Promise<SchemaSyncReport> {
  const prune = options.prune ?? schema.prune;
  const actor = options.actor ?? API_ACTOR;
  const now = new Date();

  const existingPages = await db
    .select()
    .from(pages)
    .where(eq(pages.siteId, siteId))
    .orderBy(asc(pages.sortOrder));

  const existingBlocks = existingPages.length
    ? await db
        .select()
        .from(blocks)
        .where(eq(blocks.siteId, siteId))
        .orderBy(asc(blocks.sortOrder))
    : [];

  const pageBySlug = new Map(existingPages.map((page) => [page.slug, page]));
  const blocksByPageId = new Map<string, typeof existingBlocks>();
  for (const block of existingBlocks) {
    const list = blocksByPageId.get(block.pageId);
    if (list) list.push(block);
    else blocksByPageId.set(block.pageId, [block]);
  }

  const queries: BatchItem<"pg">[] = [];
  const newPages: (typeof pages.$inferInsert)[] = [];
  const newBlocks: (typeof blocks.$inferInsert)[] = [];

  const report: SchemaSyncReport = {
    ok: true,
    created: { pages: 0, blocks: 0 },
    updated: { pages: 0, blocks: 0 },
    orphans: [],
    orphanPages: [],
    pruned: { pages: 0, blocks: 0 },
    syncedAt: now.toISOString(),
  };

  const declaredSlugs = new Set<string>();
  const orphanBlockIds: string[] = [];

  schema.pages.forEach((declaredPage, pageIndex) => {
    declaredSlugs.add(declaredPage.slug);
    const existingPage = pageBySlug.get(declaredPage.slug);
    let pageId: string;

    if (existingPage) {
      pageId = existingPage.id;
      const changed =
        existingPage.title !== declaredPage.title ||
        (existingPage.description ?? null) !== declaredPage.description ||
        existingPage.sortOrder !== pageIndex;

      if (changed) {
        report.updated.pages += 1;
        queries.push(
          db
            .update(pages)
            .set({
              title: declaredPage.title,
              description: declaredPage.description,
              sortOrder: pageIndex,
              updatedAt: now,
            })
            .where(eq(pages.id, existingPage.id)),
        );
      }
    } else {
      // Id genereras här så att sidans block kan läggas in i samma batch.
      pageId = crypto.randomUUID();
      report.created.pages += 1;
      newPages.push({
        id: pageId,
        siteId,
        slug: declaredPage.slug,
        title: declaredPage.title,
        description: declaredPage.description,
        sortOrder: pageIndex,
      });
    }

    const pageBlocks = existingPage ? (blocksByPageId.get(existingPage.id) ?? []) : [];
    const blockByKey = new Map(pageBlocks.map((block) => [block.key, block]));
    const declaredKeys = new Set<string>();

    declaredPage.blocks.forEach((declaredBlock, blockIndex) => {
      declaredKeys.add(declaredBlock.key);
      const existingBlock = blockByKey.get(declaredBlock.key);

      if (!existingBlock) {
        report.created.blocks += 1;
        newBlocks.push({
          pageId,
          siteId,
          key: declaredBlock.key,
          type: declaredBlock.type,
          value: declaredBlock.default,
          alt: declaredBlock.type === "image" ? declaredBlock.defaultAlt : null,
          label: declaredBlock.label,
          help: declaredBlock.help,
          sortOrder: blockIndex,
        });
        return;
      }

      // Kunden har inte skrivit något → default får fyllas i.
      const fillValue = isBlank(existingBlock.value) && declaredBlock.default !== null;
      const fillAlt =
        fillValue && declaredBlock.type === "image" && isBlank(existingBlock.alt) && declaredBlock.defaultAlt !== null;

      const changed =
        existingBlock.type !== declaredBlock.type ||
        (existingBlock.label ?? null) !== declaredBlock.label ||
        (existingBlock.help ?? null) !== declaredBlock.help ||
        existingBlock.sortOrder !== blockIndex ||
        fillValue;

      if (!changed) return;

      report.updated.blocks += 1;
      queries.push(
        db
          .update(blocks)
          .set({
            type: declaredBlock.type,
            label: declaredBlock.label,
            help: declaredBlock.help,
            sortOrder: blockIndex,
            ...(fillValue ? { value: declaredBlock.default } : {}),
            ...(fillAlt ? { alt: declaredBlock.defaultAlt } : {}),
            updatedAt: now,
          })
          .where(eq(blocks.id, existingBlock.id)),
      );
    });

    for (const block of pageBlocks) {
      if (declaredKeys.has(block.key)) continue;
      if (prune) {
        orphanBlockIds.push(block.id);
        report.pruned.blocks += 1;
      } else {
        report.orphans.push({ pageSlug: declaredPage.slug, key: block.key });
      }
    }
  });

  // Sidor som finns i CMS:et men inte i deklarationen.
  const orphanPageIds: string[] = [];
  for (const page of existingPages) {
    if (declaredSlugs.has(page.slug)) continue;
    const pageBlocks = blocksByPageId.get(page.id) ?? [];
    if (prune) {
      // Sidans block försvinner via ON DELETE CASCADE.
      orphanPageIds.push(page.id);
      report.pruned.pages += 1;
      report.pruned.blocks += pageBlocks.length;
    } else {
      report.orphanPages.push(page.slug);
      for (const block of pageBlocks) report.orphans.push({ pageSlug: page.slug, key: block.key });
    }
  }

  // Ordning: radera först (frigör inget unikt, men håller batchen begriplig),
  // sedan nya sidor före nya block (FK), sist uppdateringar och sajtens tidsstämpel.
  const writes: BatchItem<"pg">[] = [];
  for (const ids of chunk(orphanBlockIds, INSERT_CHUNK)) {
    writes.push(db.delete(blocks).where(inArray(blocks.id, ids)));
  }
  for (const ids of chunk(orphanPageIds, INSERT_CHUNK)) {
    writes.push(db.delete(pages).where(inArray(pages.id, ids)));
  }
  for (const rows of chunk(newPages, INSERT_CHUNK)) {
    writes.push(db.insert(pages).values(rows));
  }
  for (const rows of chunk(newBlocks, INSERT_CHUNK)) {
    writes.push(db.insert(blocks).values(rows));
  }
  writes.push(...queries);
  writes.push(db.update(sites).set({ lastSchemaSyncAt: now }).where(eq(sites.id, siteId)));

  await db.batch(writes as [BatchItem<"pg">, ...BatchItem<"pg">[]]);

  await logActivity({
    userId: actor.userId,
    userEmail: actor.userEmail,
    siteId,
    action: "schema.sync",
    detail: describeSchemaSync(report),
  });

  return report;
}

export type CurrentSchemaBlock = {
  key: string;
  type: "text" | "richtext" | "image";
  label: string | null;
  help: string | null;
  /** true om fältet har ett (icke-tomt) värde i CMS:et. */
  hasValue: boolean;
};

export type CurrentSchema = {
  version: 1;
  pages: {
    slug: string;
    title: string;
    description: string | null;
    blocks: CurrentSchemaBlock[];
  }[];
  lastSchemaSyncAt: string | null;
};

/** Nuvarande struktur i samma format som POST-schemat (utan default, med hasValue). */
export async function readCurrentSchema(siteId: string): Promise<CurrentSchema> {
  const [siteRows, sitePages, siteBlocks] = await Promise.all([
    db.select({ lastSchemaSyncAt: sites.lastSchemaSyncAt }).from(sites).where(eq(sites.id, siteId)).limit(1),
    db.select().from(pages).where(eq(pages.siteId, siteId)).orderBy(asc(pages.sortOrder), asc(pages.createdAt)),
    db.select().from(blocks).where(eq(blocks.siteId, siteId)).orderBy(asc(blocks.sortOrder), asc(blocks.createdAt)),
  ]);

  const blocksByPageId = new Map<string, CurrentSchemaBlock[]>();
  for (const block of siteBlocks) {
    const dto: CurrentSchemaBlock = {
      key: block.key,
      type: block.type,
      label: block.label,
      help: block.help,
      hasValue: !isBlank(block.value),
    };
    const list = blocksByPageId.get(block.pageId);
    if (list) list.push(dto);
    else blocksByPageId.set(block.pageId, [dto]);
  }

  return {
    version: 1,
    pages: sitePages.map((page) => ({
      slug: page.slug,
      title: page.title,
      description: page.description,
      blocks: blocksByPageId.get(page.id) ?? [],
    })),
    lastSchemaSyncAt: siteRows[0]?.lastSchemaSyncAt?.toISOString() ?? null,
  };
}
