import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { and, eq, isNull, or } from "drizzle-orm";
import { db, sites } from "@/lib/db";
import { CONTENT_CACHE_HEADERS, type ApiSite } from "@/app/api/v1/_lib/auth";
import { API_ACTOR, applySchema, readCurrentSchema, validateSchema } from "@/lib/schema-sync";
import { logActivity } from "@/lib/audit";
import { errorForLog, maskRevalidateUrl, revalidateUrlFromSiteUrl } from "@/lib/webhook-url";

/** Max storlek på ett schema i bytes (2 MB). Större → 413. */
const MAX_SCHEMA_BYTES = 2 * 1024 * 1024;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CONTENT_CACHE_HEADERS });
}

function tooLarge() {
  return json(
    {
      error: `Schemat är för stort (max ${MAX_SCHEMA_BYTES / 1024 / 1024} MB). Korta ner långa default-värden eller dela upp sajten.`,
    },
    413,
  );
}

function isUniqueViolation(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code ?? (err as { cause?: { code?: unknown } } | null)?.cause?.code;
  return code === "23505";
}

/**
 * Om kundsajten skickade med `siteUrl` och sajten saknar revalidate-URL:
 * sätt `<origin>/api/sitecms/revalidate` (och domänen, om den också saknas).
 * Skriver aldrig över befintliga värden — villkoret ligger i själva UPDATE:n,
 * så två samtidiga synkar kan inte heller skriva över varandra. Kastar
 * aldrig: schemat är redan sparat, så ett fel här får inte ge 500.
 * Returnerar sajtens revalidate-URL efteråt, maskerad (maskRevalidateUrl —
 * en deploy hook-URL är en hemlighet och skickas inte tillbaka), eller null.
 */
async function adoptSiteUrl(siteId: string, siteUrl: unknown): Promise<string | null> {
  try {
    const target = revalidateUrlFromSiteUrl(siteUrl);
    if (target) {
      const adopted = await db
        .update(sites)
        .set({ revalidateUrl: target.revalidateUrl, updatedAt: new Date() })
        .where(and(eq(sites.id, siteId), or(isNull(sites.revalidateUrl), eq(sites.revalidateUrl, ""))))
        .returning({ id: sites.id });

      if (adopted.length > 0) {
        const domainSet = await db
          .update(sites)
          .set({ domain: target.hostname })
          .where(and(eq(sites.id, siteId), or(isNull(sites.domain), eq(sites.domain, ""))))
          .returning({ id: sites.id });
        await logActivity({
          ...API_ACTOR,
          siteId,
          action: "sites.update",
          detail:
            `Kundsajten kopplade sig: revalidate-URL satt till ${target.revalidateUrl}` +
            (domainSet.length > 0 ? ` och domän till ${target.hostname}` : ""),
        });
      }
    }

    const [row] = await db.select({ revalidateUrl: sites.revalidateUrl }).from(sites).where(eq(sites.id, siteId)).limit(1);
    return maskRevalidateUrl(row?.revalidateUrl);
  } catch (err) {
    console.error(`schema sync: kunde inte sätta revalidate-URL för sajt ${siteId}: ${errorForLog(err)}`);
    return null;
  }
}

/**
 * GET /api/v1/sites/[slug]/schema och GET /api/v1/site/schema
 *
 * Nuvarande struktur i samma format som POST-schemat — utan `default`, men
 * med `hasValue` per block — så att utvecklaren kan diffa mot sin config.
 */
export async function schemaGetResponse(site: ApiSite): Promise<Response> {
  const current = await readCurrentSchema(site.id);
  return json(current);
}

/**
 * POST /api/v1/sites/[slug]/schema och POST /api/v1/site/schema
 *
 * Kundsajten deklarerar sina sidor och fält; CMS:et skapar det som saknas och
 * uppdaterar etiketter/ordning. Kundens innehåll skrivs aldrig över.
 * Format och regler: docs/SELF-SERVICE.md (avsnitt B) och lib/schema-validate.ts.
 *
 * Valfritt `siteUrl` ("https://kund.se") i bodyn: om sajten saknar
 * revalidate-URL och siteUrl är en publik https-adress sätts
 * revalidate-URL:en till `<origin>/api/sitecms/revalidate` (se adoptSiteUrl).
 * Svaret får det additiva fältet `revalidateUrl` (string | null, maskerad
 * som i health).
 */
export async function schemaPostResponse(site: ApiSite, request: Request): Promise<Response> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_SCHEMA_BYTES) {
    return tooLarge();
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return json({ error: "Kunde inte läsa request-body." }, 400);
  }
  if (new TextEncoder().encode(raw).byteLength > MAX_SCHEMA_BYTES) {
    return tooLarge();
  }

  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return json(
      { error: "Ogiltig JSON.", issues: ["Body måste vara JSON (Content-Type: application/json)."] },
      400,
    );
  }

  // validateSchema ignorerar okända toppnivåfält, så siteUrl stör inte valideringen.
  const result = validateSchema(input);
  if (!result.ok) {
    return json({ error: "Schemat är ogiltigt.", issues: result.issues }, 400);
  }

  try {
    const report = await applySchema(site.id, result.schema);
    const siteUrl = (input as Record<string, unknown>).siteUrl;
    const revalidateUrl = await adoptSiteUrl(site.id, siteUrl);
    revalidatePath(`/admin/sites/${site.id}`, "layout");
    return json({ ...report, revalidateUrl });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return json({ error: "En annan schema-sync för sajten pågick samtidigt. Försök igen." }, 409);
    }
    console.error(`schema sync failed for site ${site.slug}:`, err);
    // Säkerställ att sajten fortfarande finns (den kan ha tagits bort under tiden).
    const [stillThere] = await db.select({ id: sites.id }).from(sites).where(eq(sites.id, site.id)).limit(1);
    if (!stillThere) return json({ error: "Sajten hittades inte." }, 404);
    return json({ error: "Kunde inte spara strukturen. Inget ändrades – försök igen." }, 500);
  }
}
