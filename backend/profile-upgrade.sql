-- ============================================================
-- GIGSET — Profile upgrade (profile photo, live availability, view analytics)
-- Run ONCE in the Supabase SQL editor BEFORE deploying the new backend.
-- Idempotent: safe to re-run.
-- ============================================================

alter table "User" add column if not exists "avatarUrl" text;

create table if not exists "Availability" (
  "id"     text primary key,
  "userId" text not null references "User"("id") on delete cascade on update cascade,
  "date"   text not null,
  "status" text not null default 'BUSY'
);
create unique index if not exists "Availability_userId_date_key" on "Availability"("userId", "date");
create index if not exists "Availability_userId_idx" on "Availability"("userId");

create table if not exists "ProfileViewDay" (
  "profileId" text not null,
  "day"       text not null,
  "views"     integer not null default 0,
  primary key ("profileId", "day")
);

-- Keep both tables closed to Supabase's public REST API (the backend bypasses RLS).
alter table "Availability" enable row level security;
alter table "ProfileViewDay" enable row level security;
