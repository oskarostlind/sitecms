import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sites } from "@/lib/db/schema";
import { runSeoScore } from "@/lib/seo-score";
import { siteUrl } from "@/lib/site-url";
import { purgeOldVisitors } from "@/lib/traffic";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Så många PageSpeed-anrop som körs parallellt. */
const BATCH_SIZE = 5;

/**
 * Total deadline för PageSpeed, räknat från start. Fem parallella PSI à upp
 * till 60 s per grupp räcker bara till ~20 sajter innan maxDuration (300 s)
 * dödar funktionen och svaret går förlorat. När deadlinen passerat avbryts
 * pågående PSI-anrop och resterande sajter poängsätts content-only, så alla
 * sajter alltid får en dagsrad.
 */
const PAGESPEED_DEADLINE_MS = 240_000;

/**
 * GET /api/cron/daily  (docs/SEO-TRAFIK.md §7) — Vercel Cron 03:15 UTC.
 *
 * Kräver `Authorization: Bearer ${CRON_SECRET}` (Vercel skickar den själv;
 * saknas env → 503). Kör i ordning:
 *   1. purgeOldVisitors()  — raderar traffic_visitors äldre än 2 dagar
 *   2. runSeoScore för alla sajter, PSI i grupper om 5 med Promise.allSettled;
 *      sajter utan domän får content-only.
 * Ett fel stoppar aldrig resten. Svarar med en JSON-sammanfattning.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET är inte satt" }, { status: 503 });
  }
  if (!isAuthorized(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const started = Date.now();

  // 1. Rensa besökartabellen.
  let purgedVisitors = 0;
  try {
    purgedVisitors = await purgeOldVisitors();
  } catch (err) {
    console.error("cron/daily: purgeOldVisitors misslyckades", err);
  }

  // 2. SEO-poäng för alla sajter.
  let scored = 0;
  // Sajter som fick content-only för att deadlinen hade passerat (inte de utan domän).
  let contentOnly = 0;
  const failed: { siteId: string; error: string }[] = [];

  let allSites: { id: string; domain: string | null }[] = [];
  try {
    allSites = await db.select({ id: sites.id, domain: sites.domain }).from(sites);
  } catch (err) {
    console.error("cron/daily: kunde inte lista sajter", err);
  }

  // Deadline-signalen avbryter PSI-anrop som pågår när tiden går ut; fetchPageSpeed
  // svarar då med null och sajten får content-only i stället för att kasta.
  const deadlineAt = started + PAGESPEED_DEADLINE_MS;
  const deadline = new AbortController();
  const deadlineTimer = setTimeout(
    () => deadline.abort(new Error(`cronens PageSpeed-deadline (${PAGESPEED_DEADLINE_MS / 1000} s) passerad`)),
    PAGESPEED_DEADLINE_MS,
  );

  try {
    for (let i = 0; i < allSites.length; i += BATCH_SIZE) {
      const batch = allSites.slice(i, i + BATCH_SIZE);
      const pastDeadline = Date.now() >= deadlineAt;
      const results = await Promise.allSettled(
        batch.map((site) => {
          const hasDomain = Boolean(siteUrl(site.domain));
          if (hasDomain && pastDeadline) contentOnly += 1;
          return runSeoScore(site.id, { skipPageSpeed: !hasDomain || pastDeadline, signal: deadline.signal });
        }),
      );
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          scored += 1;
        } else {
          const error = result.reason instanceof Error ? result.reason.message : String(result.reason);
          failed.push({ siteId: batch[index].id, error });
          console.error(`cron/daily: runSeoScore misslyckades för sajt ${batch[index].id}: ${error}`);
        }
      });
    }
  } finally {
    clearTimeout(deadlineTimer);
  }

  const ms = Date.now() - started;
  console.log(
    `cron/daily: rensade ${purgedVisitors} besökarrader, poängsatte ${scored} sajter (${contentOnly} content-only p.g.a. deadline), ${failed.length} fel, ${ms} ms`,
  );

  return NextResponse.json(
    { purgedVisitors, scored, contentOnly, failed, ms },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

/** Konstanttidsjämförelse av Bearer-token. */
function isAuthorized(header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
