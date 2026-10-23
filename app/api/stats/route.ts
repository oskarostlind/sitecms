import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { collectStats } from "@/lib/stats/collect";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 15;

const HEADERS = { "Cache-Control": "no-store" };

let warnedMissingToken = false;

/**
 * GET /api/stats — Mission Control (marketing-portal) hämtar aggregerade tal.
 * Kräver `Authorization: Bearer ${STATS_TOKEN}`; saknas env → 401 (fail closed).
 * Svaret innehåller inga personuppgifter. Se lib/stats/collect.ts.
 */
export async function GET(request: Request) {
  const token = process.env.STATS_TOKEN;
  if (!token) {
    if (!warnedMissingToken) {
      warnedMissingToken = true;
      console.warn("[stats] STATS_TOKEN är inte satt — /api/stats svarar 401");
    }
    return unauthorized();
  }
  if (!isAuthorized(request.headers.get("authorization"), token)) return unauthorized();

  try {
    const stats = await collectStats();
    return NextResponse.json(stats, { headers: HEADERS });
  } catch (err) {
    console.error("[stats] collectStats misslyckades", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "stats_failed" }, { status: 500, headers: HEADERS });
  }
}

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: HEADERS });
}

/** Konstanttidsjämförelse av Bearer-token. */
function isAuthorized(header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
