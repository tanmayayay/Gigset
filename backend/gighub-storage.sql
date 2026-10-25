-- ============================================================
-- GIGSET — Gighub audio storage
-- Run once in the Supabase SQL editor (Database page).
-- Idempotent: safe to re-run.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('gighub-audio', 'gighub-audio', true)
on conflict (id) do nothing;

-- Anyone can stream the audio (public bucket).
drop policy if exists "gighub-audio: public read" on storage.objects;
create policy "gighub-audio: public read"
  on storage.objects for select
  using (bucket_id = 'gighub-audio');

-- Signed-in users can upload into the bucket.
drop policy if exists "gighub-audio: authenticated upload" on storage.objects;
create policy "gighub-audio: authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'gighub-audio');

-- Owners can delete their own uploads.
drop policy if exists "gighub-audio: owner delete" on storage.objects;
create policy "gighub-audio: owner delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'gighub-audio' and owner = auth.uid());
