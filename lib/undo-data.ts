/**
 * Formen på det som sparas i `audit_logs.undo_data` — allt som behövs för att
 * återställa en ändring, fångat *innan* den skrevs.
 *
 * Ligger i en egen modul utan beroenden så att både schemat (lib/db/schema.ts)
 * och serveråtgärderna kan använda typen utan cirkulära importer.
 *
 * Ett `undo_data` som inte matchar någon känd `kind` behandlas som "går inte
 * att ångra" i stället för att kasta fel — gammal data i tabellen ska aldrig
 * kunna krascha aktivitetsloggen.
 */

export type BlockSnapshot = {
  blockId: string;
  value: string | null;
  alt: string | null;
};

export type PostSnapshot = {
  id: string;
  siteId: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string | null;
  coverImage: string | null;
  coverImageAlt: string | null;
  published: boolean;
  publishedAt: string | null;
};

export type UndoData =
  /** Blockredigering: värdena som blocken hade före sparningen. */
  | { kind: "blocks"; blocks: BlockSnapshot[] }
  /** Inläggsredigering: hela inlägget som det såg ut före sparningen. */
  | { kind: "post.update"; post: PostSnapshot }
  /** Borttaget inlägg: hela raden, så att den kan läggas tillbaka. */
  | { kind: "post.delete"; post: PostSnapshot };

export function isUndoData(value: unknown): value is UndoData {
  if (!value || typeof value !== "object") return false;
  const kind = (value as { kind?: unknown }).kind;
  return kind === "blocks" || kind === "post.update" || kind === "post.delete";
}
