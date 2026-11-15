-- ZUNE Marketplace 2.0: seller-managed store identity and public store logo.
-- Run once in the Supabase SQL Editor for the connected project.
alter table public.stores
  add column if not exists logo_url text,
  add column if not exists description text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists website text;

grant select (owner_id,store_name,verification_status,is_active,logo_url,description,phone,email,website,region,district,address) on public.stores to anon, authenticated;

drop policy if exists "ZUNE sellers read own store profile" on public.stores;
create policy "ZUNE sellers read own store profile"
on public.stores for select to authenticated
using (owner_id = (select auth.uid()));

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

-- Keep approval and ownership fields under Admin Mkuu control.
create or replace function public.zune_guard_seller_store_profile()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
begin
  if auth.uid() is not null and not public.zune_is_admin() then
    if new.owner_id is distinct from old.owner_id
       or new.verification_status is distinct from old.verification_status
       or new.is_active is distinct from old.is_active then
      raise exception 'Seller profile edits cannot change store ownership, activation or verification status';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists zune_guard_seller_store_profile on public.stores;
create trigger zune_guard_seller_store_profile
before update on public.stores
for each row execute function public.zune_guard_seller_store_profile();
