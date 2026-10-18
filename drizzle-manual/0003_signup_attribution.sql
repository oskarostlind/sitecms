-- First-touch attribution per account (where sign-ups come from).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "signup_source" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "signup_landing" text;
CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users" ("created_at");
