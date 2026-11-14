-- Store avatar object paths, never public image URLs.
alter table public.profiles add column if not exists avatar_path text;

update public.profiles
set avatar_path = substring(avatar_url from '/storage/v1/object/public/zune-avatars/(.*)$')
where avatar_path is null
  and avatar_url like '%/storage/v1/object/public/zune-avatars/%';

update storage.buckets
set public=false,
    file_size_limit=5242880,
    allowed_mime_types=array['image/jpeg','image/png','image/webp']
where id='zune-avatars';

drop policy if exists "ZUNE public view avatars" on storage.objects;
drop policy if exists "ZUNE authenticated view avatars" on storage.objects;
create policy "ZUNE authenticated view avatars"
on storage.objects for select to authenticated
using (bucket_id='zune-avatars');

drop policy if exists "ZUNE users upload own avatar" on storage.objects;
create policy "ZUNE users upload own avatar"
on storage.objects for insert to authenticated
with check (bucket_id='zune-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "ZUNE users update own avatar" on storage.objects;
create policy "ZUNE users update own avatar"
on storage.objects for update to authenticated
using (bucket_id='zune-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check (bucket_id='zune-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "ZUNE users delete own avatar" on storage.objects;
create policy "ZUNE users delete own avatar"
on storage.objects for delete to authenticated
using (bucket_id='zune-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);

alter table public.profiles drop column if exists avatar_url;
