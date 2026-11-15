-- ZUNE Marketplace 2.0: seller-managed store identity and public store logo.
-- Run once in the Supabase SQL Editor for the connected project.
alter table public.stores
  add column if not exists logo_url text,
  add column if not exists description text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists website text;

drop policy if exists "ZUNE sellers update own store profile" on public.stores;
create policy "ZUNE sellers update own store profile"
on public.stores for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('zune-store-assets','zune-store-assets',true,8388608,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = true,
  file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "ZUNE sellers upload own store assets" on storage.objects;
create policy "ZUNE sellers upload own store assets"
on storage.objects for insert to authenticated
with check (bucket_id='zune-store-assets' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "ZUNE sellers update own store assets" on storage.objects;
create policy "ZUNE sellers update own store assets"
on storage.objects for update to authenticated
using (bucket_id='zune-store-assets' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check (bucket_id='zune-store-assets' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "ZUNE sellers delete own store assets" on storage.objects;
create policy "ZUNE sellers delete own store assets"
on storage.objects for delete to authenticated
using (bucket_id='zune-store-assets' and (storage.foldername(name))[1]=(select auth.uid())::text);
