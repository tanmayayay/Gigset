-- ============================================================
-- GIGSET — Vault (12-hour image stories)
-- Run once in the Supabase SQL editor. Idempotent: safe to re-run.
-- Photos reuse the existing `post-media` storage bucket.
-- ============================================================

create table if not exists "Story" (
  "id"        text primary key,
  "authorId"  text not null references "User"("id") on delete cascade on update cascade,
  "mediaUrl"  text not null,
  "caption"   text,
  "createdAt" timestamp(3) not null default current_timestamp,
  "expiresAt" timestamp(3) not null
);

create index if not exists "Story_authorId_idx" on "Story"("authorId");
create index if not exists "Story_expiresAt_idx" on "Story"("expiresAt");

-- The API connects as the table owner (bypasses RLS); this just keeps the
-- table closed to Supabase's public anon/authenticated REST endpoints.
alter table "Story" enable row level security;
