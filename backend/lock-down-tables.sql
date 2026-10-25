-- ============================================================
-- GIGSET — Close the public database API (IMPORTANT, run once)
-- ============================================================
-- Supabase exposes every table in the `public` schema over a REST API that
-- anyone holding the public "anon" key (it ships inside the website) can call.
-- Prisma-created tables have Row Level Security OFF by default, so without this
-- script messages, profiles and notifications could be read straight from that
-- API, bypassing our backend entirely.
--
-- This turns RLS on for every table with NO policies, which blocks the public
-- API completely. Our Express backend connects as the table owner (`postgres`),
-- which bypasses RLS, so the app keeps working exactly as before.
-- Idempotent: safe to re-run (re-run after adding new tables).
-- ============================================================
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
end $$;

-- Check: every row should say rls_enabled = true.
select tablename, rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
order by tablename;
