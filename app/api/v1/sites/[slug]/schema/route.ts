import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, sites } from "@/lib/db";
import { authenticateSite, CONTENT_CACHE_HEADERS } from "@/app/api/v1/_lib/auth";
import { applySchema, readCurrentSchema, validateSchema } from "@/lib/schema-sync";

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
 * GET /api/v1/sites/[slug]/schema
 *
 * Nuvarande struktur i samma format som POST-schemat — utan `default`, men
 * med `hasValue` per block — så att utvecklaren kan diffa mot sin config.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const auth = await authenticateSite(slug, request);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  const current = await readCurrentSchema(auth.site.id);
  return json(current);
}

/**
 * POST /api/v1/sites/[slug]/schema
 *
 * Kundsajten deklarerar sina sidor och fält; CMS:et skapar det som saknas och
 * uppdaterar etiketter/ordning. Kundens innehåll skrivs aldrig över.
 * Format och regler: docs/SELF-SERVICE.md (avsnitt B) och lib/schema-validate.ts.
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const auth = await authenticateSite(slug, request);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

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

  const result = validateSchema(input);
  if (!result.ok) {
    return json({ error: "Schemat är ogiltigt.", issues: result.issues }, 400);
  }

  try {
    const report = await applySchema(auth.site.id, result.schema);
    revalidatePath(`/admin/sites/${auth.site.id}`, "layout");
    return json(report);
  } catch (err) {
    if (isUniqueViolation(err)) {
      return json({ error: "En annan schema-sync för sajten pågick samtidigt. Försök igen." }, 409);
    }
    console.error(`schema sync failed for site ${auth.site.slug}:`, err);
    // Säkerställ att sajten fortfarande finns (den kan ha tagits bort under tiden).
    const [stillThere] = await db.select({ id: sites.id }).from(sites).where(eq(sites.id, auth.site.id)).limit(1);
    if (!stillThere) return json({ error: "Sajten hittades inte." }, 404);
    return json({ error: "Kunde inte spara strukturen. Inget ändrades – försök igen." }, 500);
  }
}
