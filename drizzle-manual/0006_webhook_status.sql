-- Signerad webhook: spara utfallet av senaste anropet till sajtens
-- revalidate-URL (vid sparat innehåll och vid "Testa anslutningen"), så att
-- panelen kan visa när ändringar inte når sajten. Bara nya, frivilliga
-- kolumner — befintliga sajter påverkas inte.
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "last_webhook_status" text;
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "last_webhook_at" timestamp with time zone;
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "last_webhook_error" text;
