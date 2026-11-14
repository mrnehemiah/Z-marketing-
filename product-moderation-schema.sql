-- ZUNE product moderation gate
-- Applied to Supabase project rpkogiieegqgxqbzwxwo.
-- Keep this schema source in the repository root for project traceability.

alter table public.products
  add column if not exists moderation_status text not null default 'pending',
  add column if not exists moderation_reason text,
  add column if not exists moderated_at timestamptz,
  add column if not exists published_at timestamptz;

update public.products
set moderation_status = 'approved',
    published_at = coalesce(published_at, created_at)
where moderation_status = 'pending'
  and created_at < now();

alter table public.products
  drop constraint if exists products_moderation_status_check;
alter table public.products
  add constraint products_moderation_status_check
  check (moderation_status in ('pending','approved','blocked','review'));

create table if not exists public.product_moderation_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid null references public.products(id) on delete set null,
  title text not null,
  status text not null check (status in ('approved','blocked','review','error')),
  reason text,
  categories jsonb not null default '{}'::jsonb,
  model text,
  created_at timestamptz not null default now()
);

alter table public.product_moderation_reviews enable row level security;

drop policy if exists "Products are viewable by everyone." on public.products;
drop policy if exists "Vendors can insert their own products." on public.products;
drop policy if exists "Vendors can update their own products." on public.products;

create policy "Public can view approved products"
on public.products for select
to anon, authenticated
using (moderation_status = 'approved');

drop policy if exists "ZUNE admins can view moderation reviews" on public.product_moderation_reviews;
create policy "ZUNE admins can view moderation reviews"
on public.product_moderation_reviews for select
to authenticated
using (public.zune_is_admin());

drop policy if exists "ZUNE active sellers upload product images" on storage.objects;
drop policy if exists "ZUNE owners or admins update product images" on storage.objects;
