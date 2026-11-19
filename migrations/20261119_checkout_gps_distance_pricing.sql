-- GPS distance-based checkout pricing.
-- Uses great-circle distance between saved seller and buyer GPS coordinates.
-- If either side has no GPS coordinates, the approved regional flat fee remains the safe fallback.
ALTER TABLE public.order_deliveries ADD COLUMN IF NOT EXISTS distance_km numeric;

CREATE OR REPLACE FUNCTION public.zune_haversine_km(
  p_lat1 double precision, p_lon1 double precision,
  p_lat2 double precision, p_lon2 double precision
) RETURNS numeric
LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path = ''
AS $$
 SELECT CASE WHEN p_lat1 IS NULL OR p_lon1 IS NULL OR p_lat2 IS NULL OR p_lon2 IS NULL THEN NULL
 ELSE round((6371.0088 * 2 * asin(sqrt(least(1::double precision,
   power(sin(radians((p_lat2-p_lat1)/2)),2) +
   cos(radians(p_lat1))*cos(radians(p_lat2))*
   power(sin(radians((p_lon2-p_lon1)/2)),2)
 ))))::numeric,2) END
$$;

-- The live checkout RPCs were patched through pg_get_functiondef/replace to preserve
-- existing coupon, stock-locking, order creation, and delivery workflow safeguards.
-- Both quote and create RPCs now:
--   * resolve the admin fee using ward > district > region,
--   * read the active seller_locations GPS point,
--   * calculate Haversine distance when both GPS points are present,
--   * charge max(minimum_fee, base_fee + ceil(distance_km)*price_per_km),
--   * enforce seller_locations.maximum_distance_km,
--   * persist distance_km on order_deliveries,
--   * return estimated_distance_km and distance_method in the quote response.
-- Missing seller/buyer GPS safely falls back to the region's base/minimum fee.
