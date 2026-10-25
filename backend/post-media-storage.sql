-- ============================================================
-- GIGSET — Post photo storage (Phase 3)
-- Run once in the Supabase SQL editor. Idempotent: safe to re-run.
-- Photos are downscaled in the browser before upload (max 1600px).
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-media', 'post-media', true, 8388608,
        array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Anyone can view post photos (public feed).
drop policy if exists "post-media: public read" on storage.objects;
create policy "post-media: public read"
  on storage.objects for select
  using (bucket_id = 'post-media');

-- Signed-in users can upload, but only into their own folder (<auth uid>/...).
drop policy if exists "post-media: own folder upload" on storage.objects;
create policy "post-media: own folder upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- Owners can delete their own photos.
drop policy if exists "post-media: owner delete" on storage.objects;
create policy "post-media: owner delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'post-media' and owner = auth.uid());
