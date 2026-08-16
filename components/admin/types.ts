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
  sortOrder: number;
};

export type BlockGroupDTO = {
  key: string;
  title: string;
  blocks: BlockDTO[];
};
