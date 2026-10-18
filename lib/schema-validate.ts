/**
 * Format och validering för schema-sync (POST /api/v1/sites/[slug]/schema).
 *
 * Kundsajten deklarerar vilka sidor och fält den har; CMS:et skapar
 * strukturen (lib/schema-sync.ts). Den här modulen är helt fri från
 * beroenden (ingen databas, inga npm-paket) så att den kan importeras var
 * som helst — routen, tester, framtida SDK — utan att dra med sig DB-klienten.
 */

export const SCHEMA_VERSION = 1;

export const SCHEMA_BLOCK_TYPES = ["text", "richtext", "image"] as const;
export type SchemaBlockType = (typeof SCHEMA_BLOCK_TYPES)[number];

/** Sidors slug: gemener, siffror, punkt, bindestreck, understreck. */
export const SCHEMA_SLUG_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;
/**
 * Fältnycklar: som slug men versaler tillåts, eftersom befintliga sajter
 * redan har camelCase-nycklar (t.ex. "footer.contactName").
 */
export const SCHEMA_KEY_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

export const SCHEMA_LIMITS = {
  pages: 100,
  blocksPerPage: 200,
  slugLength: 100,
  keyLength: 100,
  titleLength: 200,
  descriptionLength: 1000,
  labelLength: 200,
  helpLength: 1000,
  defaultLength: 100_000,
  defaultAltLength: 1000,
  /** Max antal felrader i ett 400-svar; resten sammanfattas. */
  issues: 100,
} as const;

export type SchemaBlock = {
  key: string;
  type: SchemaBlockType;
  label: string | null;
  help: string | null;
  /** Startvärde för nya (eller tomma) block. Skriver aldrig över kundens innehåll. */
  default: string | null;
  /** Startvärde för alt-texten på bildblock. */
  defaultAlt: string | null;
};

export type SchemaPage = {
  slug: string;
  title: string;
  description: string | null;
  blocks: SchemaBlock[];
};

export type SiteSchema = {
  version: typeof SCHEMA_VERSION;
  pages: SchemaPage[];
  /** true = ta bort block/sidor som inte finns i deklarationen. */
  prune: boolean;
};

export type ValidateSchemaResult =
  | { ok: true; schema: SiteSchema }
  | { ok: false; issues: string[] };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function describe(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value.length > 40 ? `${value.slice(0, 40)}…` : value);
  if (value === null) return "null";
  if (Array.isArray(value)) return "en lista";
  return typeof value === "object" ? "ett objekt" : String(value);
}

/**
 * Validerar och normaliserar ett inkommande schema. Ren funktion: samma
 * indata ger alltid samma resultat. Okända fält ignoreras (framåtkompatibelt).
 *
 * Normalisering: strängar trimmas (utom `default`, som sparas exakt), tomma
 * valfria strängar blir null, `type` saknas → "text", `prune` saknas → false,
 * `version` saknas → 1.
 */
export function validateSchema(input: unknown): ValidateSchemaResult {
  const issues: string[] = [];

  if (!isPlainObject(input)) {
    return { ok: false, issues: ["Schemat måste vara ett JSON-objekt med fälten version och pages."] };
  }

  if (input.version !== undefined && input.version !== SCHEMA_VERSION) {
    issues.push(`version: måste vara ${SCHEMA_VERSION} (fick ${describe(input.version)}).`);
  }

  let prune = false;
  if (input.prune !== undefined) {
    if (typeof input.prune === "boolean") {
      prune = input.prune;
    } else {
      issues.push(`prune: måste vara true eller false (fick ${describe(input.prune)}).`);
    }
  }

  /** Valfri sträng: undefined/null/"" → null; annat än sträng → fel. */
  function optionalString(value: unknown, path: string, max: number, trim = true): string | null {
    if (value === undefined || value === null) return null;
    if (typeof value !== "string") {
      issues.push(`${path}: måste vara en textsträng (fick ${describe(value)}).`);
      return null;
    }
    const result = trim ? value.trim() : value;
    if (result.length > max) {
      issues.push(`${path}: får vara högst ${max} tecken (är ${result.length}).`);
    }
    return result === "" ? null : result;
  }

  function requiredString(value: unknown, path: string, max: number): string {
    if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
      issues.push(`${path}: saknas.`);
      return "";
    }
    return optionalString(value, path, max) ?? "";
  }

  const pages: SchemaPage[] = [];

  if (!Array.isArray(input.pages)) {
    issues.push(
      input.pages === undefined ? "pages: saknas – ange en lista med sidor." : `pages: måste vara en lista (fick ${describe(input.pages)}).`,
    );
  } else if (input.pages.length === 0) {
    issues.push("pages: listan är tom – deklarera minst en sida.");
  } else if (input.pages.length > SCHEMA_LIMITS.pages) {
    issues.push(`pages: högst ${SCHEMA_LIMITS.pages} sidor per sajt (fick ${input.pages.length}).`);
  } else {
    const seenSlugs = new Map<string, number>();

    input.pages.forEach((rawPage, pageIndex) => {
      const pagePath = `pages[${pageIndex}]`;
      if (!isPlainObject(rawPage)) {
        issues.push(`${pagePath}: måste vara ett objekt med slug, title och blocks.`);
        return;
      }

      const slug = requiredString(rawPage.slug, `${pagePath}.slug`, SCHEMA_LIMITS.slugLength);
      if (slug) {
        if (!SCHEMA_SLUG_PATTERN.test(slug)) {
          issues.push(
            `${pagePath}.slug: ${describe(slug)} är ogiltig – använd a–z, 0–9, punkt, bindestreck eller understreck och börja med en bokstav eller siffra.`,
          );
        } else if (seenSlugs.has(slug)) {
          issues.push(`${pagePath}.slug: ${describe(slug)} finns redan i pages[${seenSlugs.get(slug)}].`);
        } else {
          seenSlugs.set(slug, pageIndex);
        }
      }

      const title = requiredString(rawPage.title, `${pagePath}.title`, SCHEMA_LIMITS.titleLength);
      const description = optionalString(rawPage.description, `${pagePath}.description`, SCHEMA_LIMITS.descriptionLength);

      const blocks: SchemaBlock[] = [];
      const rawBlocks = rawPage.blocks === undefined ? [] : rawPage.blocks;

      if (!Array.isArray(rawBlocks)) {
        issues.push(`${pagePath}.blocks: måste vara en lista (fick ${describe(rawBlocks)}).`);
      } else if (rawBlocks.length > SCHEMA_LIMITS.blocksPerPage) {
        issues.push(`${pagePath}.blocks: högst ${SCHEMA_LIMITS.blocksPerPage} fält per sida (fick ${rawBlocks.length}).`);
      } else {
        const seenKeys = new Map<string, number>();

        rawBlocks.forEach((rawBlock, blockIndex) => {
          const blockPath = `${pagePath}.blocks[${blockIndex}]`;
          if (!isPlainObject(rawBlock)) {
            issues.push(`${blockPath}: måste vara ett objekt med key och type.`);
            return;
          }

          const key = requiredString(rawBlock.key, `${blockPath}.key`, SCHEMA_LIMITS.keyLength);
          if (key) {
            if (!SCHEMA_KEY_PATTERN.test(key)) {
              issues.push(
                `${blockPath}.key: ${describe(key)} är ogiltig – använd bokstäver a–z, siffror, punkt, bindestreck eller understreck (t.ex. "hero.title").`,
              );
            } else if (seenKeys.has(key)) {
              issues.push(`${blockPath}.key: ${describe(key)} finns redan i ${pagePath}.blocks[${seenKeys.get(key)}].`);
            } else {
              seenKeys.set(key, blockIndex);
            }
          }

          let type: SchemaBlockType = "text";
          if (rawBlock.type !== undefined) {
            if (typeof rawBlock.type === "string" && (SCHEMA_BLOCK_TYPES as readonly string[]).includes(rawBlock.type)) {
              type = rawBlock.type as SchemaBlockType;
            } else {
              issues.push(`${blockPath}.type: ${describe(rawBlock.type)} stöds inte – använd ${SCHEMA_BLOCK_TYPES.join(", ")}.`);
            }
          }

          const label = optionalString(rawBlock.label, `${blockPath}.label`, SCHEMA_LIMITS.labelLength);
          const help = optionalString(rawBlock.help, `${blockPath}.help`, SCHEMA_LIMITS.helpLength);
          // default sparas exakt som det skickas (radbrytningar/markdown i richtext).
          const defaultValue = optionalString(rawBlock.default, `${blockPath}.default`, SCHEMA_LIMITS.defaultLength, false);
          const defaultAlt = optionalString(rawBlock.defaultAlt, `${blockPath}.defaultAlt`, SCHEMA_LIMITS.defaultAltLength);

          blocks.push({
            key,
            type,
            label,
            help,
            default: defaultValue !== null && defaultValue.trim() === "" ? null : defaultValue,
            defaultAlt: type === "image" ? defaultAlt : null,
          });
        });
      }

      pages.push({ slug, title, description, blocks });
    });
  }

  if (issues.length > 0) {
    if (issues.length > SCHEMA_LIMITS.issues) {
      const rest = issues.length - SCHEMA_LIMITS.issues;
      return { ok: false, issues: [...issues.slice(0, SCHEMA_LIMITS.issues), `…och ${rest} fel till.`] };
    }
    return { ok: false, issues };
  }

  return { ok: true, schema: { version: SCHEMA_VERSION, pages, prune } };
}
