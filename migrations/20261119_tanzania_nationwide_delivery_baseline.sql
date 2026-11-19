-- ZUNE Marketplace: nationwide baseline delivery pricing
-- Applies a TSh 3,000 base/minimum fee + TSh 500 per km as the regional fallback.
-- Existing ward/district prices remain more specific and take precedence.
-- Idempotent: rerunning will not create duplicate region-level rows.

insert into public.delivery_pricing
  (country, region, district, ward, base_fee, price_per_km, minimum_fee,
   maximum_distance_km, currency, is_active, delivery_type, distance_type,
   estimated_time_minutes, surge_multiplier, free_delivery_minimum_order, updated_at)
select
  'Tanzania', v.region, null, null, 3000, 500, 3000,
  100, 'TZS', true, 'Standard', 'Per KM', 60, 1.00, 0, now()
from (values
  ('Arusha'), ('Dar es Salaam'), ('Dodoma'), ('Geita'), ('Iringa'), ('Kagera'),
  ('Katavi'), ('Kigoma'), ('Kilimanjaro'), ('Lindi'), ('Manyara'), ('Mara'),
  ('Mbeya'), ('Morogoro'), ('Mtwara'), ('Mwanza'), ('Njombe'), ('Pwani'),
  ('Rukwa'), ('Ruvuma'), ('Shinyanga'), ('Simiyu'), ('Singida'), ('Songwe'),
  ('Tabora'), ('Tanga'), ('Kaskazini Pemba'), ('Kusini Pemba'),
  ('Kaskazini Unguja'), ('Kusini Unguja'), ('Mjini Magharibi')
) as v(region)
where not exists (
  select 1
  from public.delivery_pricing dp
  where dp.is_active = true
    and lower(trim(dp.country)) = 'tanzania'
    and lower(trim(dp.region)) = lower(trim(v.region))
    and dp.district is null
    and dp.ward is null
);
