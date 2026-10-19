import { createHash, randomBytes } from "node:crypto";

/**
 * API-nycklar lagras aldrig i klartext. Databasen har bara en SHA-256-hash
 * (för uppslag vid autentisering) och de fyra sista tecknen (för att kunna
 * känna igen nyckeln i listor). Klartexten finns bara i det ögonblick nyckeln
 * skapas och lämnas till användaren via en krypterad engångscookie
 * (lib/reveal-flash.ts) — aldrig i en URL.
 *
 * Nycklarna är slumpmässiga 192-bitars värden, så en snabb hash räcker: det
 * finns inget lösenordsliknande värde att gissa sig till.
 */
export const API_KEY_PREFIX = "scms_";

export function generateApiKey(): string {
  return `${API_KEY_PREFIX}${randomBytes(24).toString("base64url")}`;
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

/** Kolumnvärdena som sparas för en ny nyckel. */
export function apiKeyColumns(key: string): { keyHash: string; keyHint: string } {
  return { keyHash: hashApiKey(key), keyHint: key.slice(-4) };
}

export function maskApiKey(hint: string): string {
  return `••••••••${hint}`;
}
