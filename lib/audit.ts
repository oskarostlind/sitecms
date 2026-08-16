import { db, auditLogs } from "@/lib/db";
import type { UndoData } from "@/lib/undo-data";

export type LogActivityInput = {
  userId: string;
  userEmail: string;
  siteId?: string | null;
  action: string;
  detail?: string;
  /**
   * Tillståndet före ändringen. Sätts av de anrop där ändringen ska gå att
   * ångra från aktivitetsloggen (lib/actions/undo.ts). Utelämnas den blir
   * posten en ren historikrad.
   */
  undoData?: UndoData | null;
};

/**
 * Records an entry in the activity log (aktivitetsloggen). Fire-and-forget:
 * errors are caught and logged to the server console but never thrown, so a
 * logging failure can never break the calling server action or redirect.
 *
 * Returns the id of the new entry (or null if the write failed) so callers
 * can hand the user an "Ångra"-knapp for the change they just made.
 *
 * Contract: call sites across the codebase depend on this exact signature
 * (single `input` object). Do not change the shape without updating every
 * caller in lib/actions/*.
 */
export async function logActivity(input: LogActivityInput): Promise<string | null> {
  try {
    const [row] = await db
      .insert(auditLogs)
      .values({
        userId: input.userId,
        userEmail: input.userEmail,
        siteId: input.siteId ?? null,
        action: input.action,
        detail: input.detail ?? null,
        undoData: input.undoData ?? null,
      })
      .returning({ id: auditLogs.id });

    return row?.id ?? null;
  } catch (err) {
    console.error("logActivity: misslyckades att spara aktivitetslogg", err);
    return null;
  }
}
