import { db, auditLogs } from "@/lib/db";

export type LogActivityInput = {
  userId: string;
  userEmail: string;
  siteId?: string | null;
  action: string;
  detail?: string;
};

/**
 * Records an entry in the activity log (aktivitetsloggen). Fire-and-forget:
 * errors are caught and logged to the server console but never thrown, so a
 * logging failure can never break the calling server action or redirect.
 *
 * Contract: call sites across the codebase depend on this exact signature
 * (single `input` object). Do not change the shape without updating every
 * caller in lib/actions/*.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: input.userId,
      userEmail: input.userEmail,
      siteId: input.siteId ?? null,
      action: input.action,
      detail: input.detail ?? null,
    });
  } catch (err) {
    console.error("logActivity: misslyckades att spara aktivitetslogg", err);
  }
}
