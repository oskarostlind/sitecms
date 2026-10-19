-- API-nycklar: sluta lagra klartext (steg 2 av 2).
-- Koden som autentiserar mot key_hash är live sedan 0004, så klartexten
-- raderas nu helt. Nycklar som någon tappat bort ersätts med nya i panelen.
DROP INDEX IF EXISTS "api_keys_key_idx";
ALTER TABLE "api_keys" DROP COLUMN IF EXISTS "key";
