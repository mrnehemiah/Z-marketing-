-- Allow sellers to update only the discount fields on their own products.
create or replace function public.zune_guard_vendor_product_discount_update()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
begin
  if not public.zune_is_admin()
     and (to_jsonb(new) - 'discount_percent' - 'is_deal')
         is distinct from
         (to_jsonb(old) - 'discount_percent' - 'is_deal') then
    raise exception 'Sellers may only change discount_percent and is_deal on their products';
  end if;
  return new;
end;
$$;

drop trigger if exists zune_guard_vendor_product_discount_update on public.products;
create trigger zune_guard_vendor_product_discount_update
before update on public.products
for each row execute function public.zune_guard_vendor_product_discount_update();

drop policy if exists vendors_update_own_product_discounts on public.products;
create policy vendors_update_own_product_discounts
on public.products for update to authenticated
using (vendor_id = (select auth.uid()))
with check (vendor_id = (select auth.uid()));
