import { NextResponse } from "next/server";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db, quoteRequests, sites } from "@/lib/db";
import type { ApiSite } from "@/app/api/v1/_lib/auth";
import { validateQuote } from "@/lib/quote-validation";
import { sendCompanyNotification, sendCustomerReceipt } from "@/lib/quote-mail";

/** Max requests per sender IP per site and hour. */
const RATE_LIMIT_PER_HOUR = 5;
/** Requests older than this are deleted (GDPR, see the customer site's privacy policy). */
const RETENTION_MONTHS = 12;

/**
 * Shared body of POST /api/v1/sites/[slug]/quote-requests and
 * POST /api/v1/site/quote-requests.
 *
 * Called server-to-server by a customer site's quote form (x-api-key). The
 * customer site does the spam checks that need the browser (honeypot, time
 * trap) and forwards a salted hash of the sender's IP as `ipHash`; the CMS
 * re-validates every field, enforces the per-IP rate limit, stores the
 * request and e-mails the company + a receipt to the customer. E-mail
 * failures never lose the request: it is stored first and the outcome is
 * recorded on the row.
 */
export async function quoteRequestResponse(site: ApiSite, request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON." }, { status: 400 });
  }

  const result = validateQuote(body);
  if (!result.ok) {
    return NextResponse.json({ error: "Valideringsfel.", fields: result.errors }, { status: 400 });
  }

  const rawIpHash = (body as Record<string, unknown>).ipHash;
  const ipHash = typeof rawIpHash === "string" && /^[a-f0-9]{16,128}$/.test(rawIpHash) ? rawIpHash : null;

  const siteId = site.id;

  if (ipHash) {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(quoteRequests)
      .where(and(eq(quoteRequests.siteId, siteId), eq(quoteRequests.ipHash, ipHash), gte(quoteRequests.createdAt, since)));
    if (count >= RATE_LIMIT_PER_HOUR) {
      return NextResponse.json(
        { error: "För många förfrågningar från samma adress. Försök igen om en stund eller ring oss." },
        { status: 429 },
      );
    }
  }

  const [row] = await db
    .insert(quoteRequests)
    .values({ siteId, ...result.data, ipHash, status: "ny", emailStatus: "skipped" })
    .returning({ id: quoteRequests.id });

  // Housekeeping: drop requests past the retention period for this site.
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - RETENTION_MONTHS);
  await db.delete(quoteRequests).where(and(eq(quoteRequests.siteId, siteId), lt(quoteRequests.createdAt, cutoff)));

  const [siteRow] = await db
    .select({ name: sites.name, notifyEmail: sites.notifyEmail })
    .from(sites)
    .where(eq(sites.id, siteId))
    .limit(1);

  let emailStatus: "sent" | "failed" | "skipped" = "skipped";
  let emailError: string | null = null;

  if (siteRow?.notifyEmail) {
    const [company, receipt] = await Promise.all([
      sendCompanyNotification(siteRow.name, siteRow.notifyEmail, result.data),
      sendCustomerReceipt(siteRow.name, result.data, siteRow.notifyEmail),
    ]);
    const failures = [company, receipt].filter((r) => !r.ok);
    if (failures.length === 0) {
      emailStatus = "sent";
    } else if (failures.every((f) => !f.ok && f.skipped)) {
      emailStatus = "skipped";
      emailError = "E-post ej konfigurerad (RESEND_API_KEY/MAIL_FROM).";
    } else {
      emailStatus = "failed";
      emailError = failures.map((f) => (!f.ok ? f.error : "")).join("; ").slice(0, 500);
      console.error(`quote-requests: e-post misslyckades för ${row.id}: ${emailError}`);
    }
  } else {
    emailError = "Ingen e-post för förfrågningar inställd för sajten.";
  }

  await db
    .update(quoteRequests)
    .set({ emailStatus, emailError, updatedAt: new Date() })
    .where(eq(quoteRequests.id, row.id));

  return NextResponse.json({ id: row.id, emailStatus }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
