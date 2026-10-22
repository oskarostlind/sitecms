-- Offertförfrågningar v2: fler fält från kundsajtens formulär + bilagor.
-- Alla nya kolumner är nullable — befintliga rader och sajter som inte
-- skickar fälten påverkas inte. Idempotent.
--
-- customer_type: "privat" | "foretag"
-- budget:        fritext/intervall (max 100 tecken)
-- rot:           kunden vill använda ROT-avdrag
-- postal_code:   postnummer (max 10 tecken)
-- source:        leadkälla (utm/referrer-sträng från sajten, max 500 tecken)
-- attachments:   [{ "url", "name", "contentType", "size" }] (max 10 st)
-- extra:         fria nyckel/värde-par (string → string, max 20 nycklar)
ALTER TABLE "quote_requests" ADD COLUMN IF NOT EXISTS "customer_type" text;
ALTER TABLE "quote_requests" ADD COLUMN IF NOT EXISTS "budget" text;
ALTER TABLE "quote_requests" ADD COLUMN IF NOT EXISTS "rot" boolean;
ALTER TABLE "quote_requests" ADD COLUMN IF NOT EXISTS "postal_code" text;
ALTER TABLE "quote_requests" ADD COLUMN IF NOT EXISTS "source" text;
ALTER TABLE "quote_requests" ADD COLUMN IF NOT EXISTS "attachments" jsonb;
ALTER TABLE "quote_requests" ADD COLUMN IF NOT EXISTS "extra" jsonb;

-- quote_uploads: en rad per fil som laddats upp via
-- POST /api/v1/site/quote-requests/attachments. Används för rate limit
-- (30/h per ip_hash och sajt) och för att städa bort blobbar som laddades
-- upp men aldrig bifogades en förfrågan (raden tas bort när förfrågan
-- sparas; kvarvarande rader äldre än ett dygn är föräldralösa).
CREATE TABLE IF NOT EXISTS "quote_uploads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "site_id" uuid NOT NULL,
  "ip_hash" text,
  "url" text NOT NULL,
  "name" text NOT NULL,
  "content_type" text NOT NULL,
  "size" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
DO $$ BEGIN
  ALTER TABLE "quote_uploads" ADD CONSTRAINT "quote_uploads_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "quote_uploads_site_ip_created_idx" ON "quote_uploads" ("site_id", "ip_hash", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "quote_uploads_url_idx" ON "quote_uploads" ("url");
