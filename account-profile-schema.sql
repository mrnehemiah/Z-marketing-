-- ZUNE Account / My Profile schema additions (idempotent)
alter table public.profiles
  add column if not exists date_of_birth date,
  add column if not exists gender text,
  add column if not exists residential_address text;

alter table public.delivery_addresses
  add column if not exists delivery_notes text,
  add column if not exists latitude numeric(10,7),
  add column if not exists longitude numeric(10,7);

do $$
begin
  if not exists (select 1 from pg_constraint where conname='delivery_addresses_latitude_range' and conrelid='public.delivery_addresses'::regclass) then
    alter table public.delivery_addresses add constraint delivery_addresses_latitude_range check (latitude is null or latitude between -90 and 90);
  end if;
  if not exists (select 1 from pg_constraint where conname='delivery_addresses_longitude_range' and conrelid='public.delivery_addresses'::regclass) then
    alter table public.delivery_addresses add constraint delivery_addresses_longitude_range check (longitude is null or longitude between -180 and 180);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='security_events' and policyname='Users read own security events') then
    create policy "Users read own security events" on public.security_events
      for select to authenticated using ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='stores' and policyname='Public can view active stores') then
    create policy "Public can view active stores" on public.stores
      for select to anon using (is_active = true);
  end if;
end $$;

-- Public QR profiles may read only the minimal store fields needed for identity display.
grant select (owner_id, store_name, verification_status, is_active) on public.stores to anon;