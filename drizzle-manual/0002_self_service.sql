-- Self-service: owners/editors per site, e-mail tokens, schema sync metadata.
-- Every statement is idempotent so the file can be re-run safely.

ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified_at" timestamp with time zone;

ALTER TABLE "memberships" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'editor' NOT NULL;

ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "created_by_user_id" uuid;
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "last_schema_sync_at" timestamp with time zone;
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "last_connection_status" text;
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "last_connection_checked_at" timestamp with time zone;

ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "description" text;

ALTER TABLE "blocks" ADD COLUMN IF NOT EXISTS "label" text;
ALTER TABLE "blocks" ADD COLUMN IF NOT EXISTS "help" text;

CREATE TABLE IF NOT EXISTS "auth_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "token_hash" text NOT NULL,
  "type" text NOT NULL,
  "user_id" uuid NOT NULL,
  "email" text NOT NULL,
  "site_id" uuid,
  "membership_role" text,
  "invited_by_user_id" uuid,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
DO $$ BEGIN
  ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "auth_tokens_hash_idx" ON "auth_tokens" ("token_hash");
CREATE INDEX IF NOT EXISTS "auth_tokens_user_idx" ON "auth_tokens" ("user_id");

-- Existing customer accounts were created by hand and have proven e-mail addresses.
UPDATE "users" SET "email_verified_at" = now() WHERE "email_verified_at" IS NULL;
-- Existing customer memberships stay 'editor': that matches what customers
-- could do before (content only); Oskar remains admin over every site.
