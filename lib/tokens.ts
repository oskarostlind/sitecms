import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { authTokens, type AuthTokenType, type MembershipRole } from "@/lib/db/schema";

/**
 * One-time e-mail tokens (verify / reset / invite). The raw token is only
 * ever placed in the e-mail link; the database stores its sha256 so a leaked
 * database dump cannot be used to take over accounts.
 */

export const TOKEN_TTL_HOURS: Record<AuthTokenType, number> = {
  verify: 24 * 7,
  reset: 2,
  invite: 24 * 7,
};

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export type CreateTokenInput = {
  type: AuthTokenType;
  userId: string;
  email: string;
  siteId?: string | null;
  membershipRole?: MembershipRole | null;
  invitedByUserId?: string | null;
};

/** Creates a token row and returns the raw token to put in the link. */
export async function createToken(input: CreateTokenInput): Promise<string> {
  const raw = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS[input.type] * 3600 * 1000);

  // Earlier unused tokens of the same type for the same user stop working, so
  // "resend" never leaves several live links around.
  await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(authTokens.userId, input.userId),
        eq(authTokens.type, input.type),
        isNull(authTokens.usedAt),
        ...(input.siteId ? [eq(authTokens.siteId, input.siteId)] : []),
      ),
    );

  await db.insert(authTokens).values({
    tokenHash: hashToken(raw),
    type: input.type,
    userId: input.userId,
    email: input.email.toLowerCase(),
    siteId: input.siteId ?? null,
    membershipRole: input.membershipRole ?? null,
    invitedByUserId: input.invitedByUserId ?? null,
    expiresAt,
  });

  return raw;
}

export type TokenRow = typeof authTokens.$inferSelect;

/** Looks a raw token up without consuming it (for rendering the accept page). */
export async function peekToken(raw: string, type: AuthTokenType): Promise<TokenRow | null> {
  if (!raw || raw.length > 200) return null;
  const [row] = await db
    .select()
    .from(authTokens)
    .where(and(eq(authTokens.tokenHash, hashToken(raw)), eq(authTokens.type, type)))
    .limit(1);
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) return null;
  return row;
}

/** Marks a token used. Returns the row, or null if it was invalid/expired/used. */
export async function consumeToken(raw: string, type: AuthTokenType): Promise<TokenRow | null> {
  const row = await peekToken(raw, type);
  if (!row) return null;
  const [updated] = await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(authTokens.id, row.id), isNull(authTokens.usedAt)))
    .returning();
  return updated ?? null;
}
