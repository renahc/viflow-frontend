-- Run once in the project's SQL Editor (or with Supabase migrations).
-- Private bucket: no public access to profile images.
begin;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('account-avatars', 'account-avatars', false, 1048576,
        array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "viflow_avatar_select_own" on storage.objects;
create policy "viflow_avatar_select_own" on storage.objects for select to authenticated
using (bucket_id = 'account-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "viflow_avatar_insert_own" on storage.objects;
create policy "viflow_avatar_insert_own" on storage.objects for insert to authenticated
with check (bucket_id = 'account-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "viflow_avatar_delete_own" on storage.objects;
create policy "viflow_avatar_delete_own" on storage.objects for delete to authenticated
using (bucket_id = 'account-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- Replacement uploads use new names; no UPDATE permission is required.
commit;
