import type { sites, blocks } from "@/lib/db/schema";

export type Site = typeof sites.$inferSelect;
export type BlockRow = typeof blocks.$inferSelect;

export type BlockDTO = {
  id: string;
  key: string;
  type: BlockRow["type"];
  value: string;
  /** Alt-text för bildblock; "" för övriga typer. */
  alt: string;
  /** Etikett från DB (oftast satt av schema-sync). null → fallback i labels.ts. */
  label: string | null;
  /** Hjälptext från DB. null → fallback i labels.ts. */
  help: string | null;
  sortOrder: number;
};

export type BlockGroupDTO = {
  key: string;
  title: string;
  blocks: BlockDTO[];
};
