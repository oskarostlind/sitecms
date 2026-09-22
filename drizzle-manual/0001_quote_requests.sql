ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "notify_email" text;
CREATE TABLE IF NOT EXISTS "quote_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "site_id" uuid NOT NULL,
  "status" text DEFAULT 'ny' NOT NULL,
  "name" text NOT NULL,
  "company" text,
  "phone" text NOT NULL,
  "email" text NOT NULL,
  "job_type" text NOT NULL,
  "machine" text,
  "location" text,
  "desired_start" text,
  "description" text NOT NULL,
  "consent" boolean DEFAULT false NOT NULL,
  "ip_hash" text,
  "email_status" text DEFAULT 'skipped' NOT NULL,
  "email_error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
DO $$ BEGIN
  ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "quote_requests_site_created_idx" ON "quote_requests" ("site_id", "created_at");
