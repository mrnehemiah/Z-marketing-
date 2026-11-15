-- Persist each seller's storefront design for customers on every device.
alter table public.stores
  add column if not exists storefront_template text not null default 'classic';
alter table public.stores
  drop constraint if exists stores_storefront_template_check;
alter table public.stores
  add constraint stores_storefront_template_check
  check (storefront_template in ('classic','editorial','hero','compact','boutique','catalog','stories','minimal','deals','showcase'));
grant select (storefront_template) on public.stores to anon, authenticated;
grant update (storefront_template) on public.stores to authenticated;
