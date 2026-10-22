-- SEO & Trafik (docs/SEO-TRAFIK.md §2).
-- Egen cookiefri pixel: aldrig råevents, bara dagsaggregat per sajt och en
-- kortlivad besökartabell som enbart finns för att räkna unika (raderas av
-- cron när day < idag − 2). seo_scores: en rad per sajt och dag med poäng,
-- delpoäng, fynd (jsonb) och Lighthouse-resultat. Idempotent.

CREATE TABLE IF NOT EXISTS "traffic_daily" (
  "site_id" uuid NOT NULL,
  "day" date NOT NULL,
  "views" integer DEFAULT 0 NOT NULL,
  "visitors" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "traffic_daily_pk" PRIMARY KEY ("site_id", "day")
);
DO $$ BEGIN
  ALTER TABLE "traffic_daily" ADD CONSTRAINT "traffic_daily_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "traffic_daily_dims" (
  "site_id" uuid NOT NULL,
  "day" date NOT NULL,
  "dim" text NOT NULL,
  "value" text NOT NULL,
  "views" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "traffic_daily_dims_pk" PRIMARY KEY ("site_id", "day", "dim", "value")
);
DO $$ BEGIN
  ALTER TABLE "traffic_daily_dims" ADD CONSTRAINT "traffic_daily_dims_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "traffic_daily_dims_site_day_dim_idx" ON "traffic_daily_dims" ("site_id", "day", "dim");

CREATE TABLE IF NOT EXISTS "traffic_visitors" (
  "site_id" uuid NOT NULL,
  "day" date NOT NULL,
  "visitor_hash" text NOT NULL,
  "views" integer DEFAULT 1 NOT NULL,
  CONSTRAINT "traffic_visitors_pk" PRIMARY KEY ("site_id", "day", "visitor_hash")
);
DO $$ BEGIN
  ALTER TABLE "traffic_visitors" ADD CONSTRAINT "traffic_visitors_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "traffic_visitors_day_idx" ON "traffic_visitors" ("day");

CREATE TABLE IF NOT EXISTS "seo_scores" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "site_id" uuid NOT NULL,
  "day" date NOT NULL,
  "score" integer NOT NULL,
  "content_score" integer NOT NULL,
  "lighthouse_score" integer,
  "tech_score" integer,
  "findings" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "lighthouse" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
DO $$ BEGIN
  ALTER TABLE "seo_scores" ADD CONSTRAINT "seo_scores_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "seo_scores_site_day_idx" ON "seo_scores" ("site_id", "day");
