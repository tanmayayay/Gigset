-- Strings: age-aware content filtering. Safe to run more than once.
-- Run in the Supabase SQL editor BEFORE deploying the API.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "birthDate"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "contentOpen" BOOLEAN NOT NULL DEFAULT false;
