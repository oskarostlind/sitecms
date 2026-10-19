-- API-nycklar: sluta lagra klartext (steg 1 av 2).
-- Lägger till SHA-256-hash + de fyra sista tecknen, fyller i dem för
-- befintliga nycklar och gör den gamla klartextkolumnen frivillig.
-- Klartextkolumnen raderas i 0005 först när koden som läser hashen är live,
-- så att den gamla deployen fortsätter fungera under bygget.
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "key_hash" text;
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "key_hint" text;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'key'
  ) THEN
    UPDATE "api_keys"
      SET "key_hash" = encode(sha256(convert_to("key", 'UTF8')), 'hex'),
          "key_hint" = right("key", 4)
      WHERE "key_hash" IS NULL AND "key" IS NOT NULL;
    ALTER TABLE "api_keys" ALTER COLUMN "key" DROP NOT NULL;
  END IF;
END $$;
ALTER TABLE "api_keys" ALTER COLUMN "key_hash" SET NOT NULL;
ALTER TABLE "api_keys" ALTER COLUMN "key_hint" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_key_hash_idx" ON "api_keys" ("key_hash");
