-- Live-förhandsgranskning (docs/LIVE-PREVIEW.md §2).
-- preview_sessions: kortlivade sessioner för panelens förhandsgranskning.
-- Rå token lagras aldrig — bara sha256-hex. Osparade ändringar ligger i
-- "overrides" och syns enbart i förhandsgranskningen.
-- sites.preview_url: valfri bas-URL för förhandsgranskning (t.ex. en
-- branch-URL hos webbhotellet). Bara nya objekt — befintliga sajter
-- påverkas inte. Idempotent.
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "preview_url" text;

CREATE TABLE IF NOT EXISTS "preview_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "site_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "token_hash" text NOT NULL,
  "panel_origin" text NOT NULL,
  "overrides" jsonb DEFAULT '{"blocks":{}}'::jsonb NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
DO $$ BEGIN
  ALTER TABLE "preview_sessions" ADD CONSTRAINT "preview_sessions_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "preview_sessions" ADD CONSTRAINT "preview_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "preview_sessions_token_hash_idx" ON "preview_sessions" ("token_hash");
CREATE INDEX IF NOT EXISTS "preview_sessions_site_expires_idx" ON "preview_sessions" ("site_id", "expires_at");
