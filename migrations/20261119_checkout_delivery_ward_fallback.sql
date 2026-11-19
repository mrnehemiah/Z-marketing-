-- ZUNE checkout delivery pricing: ward-first lookup with district/region fallback.
-- Existing Admin pricing rows are preserved; this migration does not invent fees.

CREATE OR REPLACE FUNCTION public.get_zune_delivery_quote(
  p_country text, p_region text, p_district text, p_ward text
)
RETURNS TABLE(found boolean, pricing_id uuid, base_fee numeric, price_per_km numeric, minimum_fee numeric, currency text, matched_level text)
LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
  SELECT (p.id IS NOT NULL), p.id, COALESCE(p.base_fee,0::numeric),
    COALESCE(p.price_per_km,0::numeric), COALESCE(p.minimum_fee,0::numeric),
    COALESCE(p.currency,'TZS'),
    CASE
      WHEN p.id IS NULL THEN 'unavailable'
      WHEN p.ward IS NOT NULL AND lower(trim(p.ward)) NOT IN ('all wards','all wards / kata zote','kata zote')
        AND lower(trim(p.ward))=lower(trim(coalesce(p_ward,''))) THEN 'ward'
      WHEN p.district IS NOT NULL THEN 'district'
      ELSE 'region'
    END
  FROM (SELECT 1) source
  LEFT JOIN LATERAL (
    SELECT dp.* FROM public.delivery_pricing dp
    WHERE dp.is_active=TRUE
      AND lower(trim(dp.country))=lower(trim(p_country))
      AND lower(trim(dp.region))=lower(trim(p_region))
      AND (dp.district IS NULL OR lower(trim(dp.district))=lower(trim(p_district)))
      AND (dp.ward IS NULL
        OR lower(trim(dp.ward)) IN ('all wards','all wards / kata zote','kata zote')
        OR (nullif(trim(coalesce(p_ward,'')),'') IS NOT NULL AND lower(trim(dp.ward))=lower(trim(p_ward))))
    ORDER BY CASE
      WHEN nullif(trim(coalesce(p_ward,'')),'') IS NOT NULL AND dp.ward IS NOT NULL
        AND lower(trim(dp.ward)) NOT IN ('all wards','all wards / kata zote','kata zote')
        AND lower(trim(dp.ward))=lower(trim(p_ward)) THEN 0
      WHEN dp.district IS NOT NULL AND dp.ward IS NULL THEN 1
      WHEN dp.district IS NOT NULL THEN 2
      ELSE 3
    END, dp.updated_at DESC NULLS LAST, dp.created_at DESC
    LIMIT 1
  ) p ON TRUE;
$function$;

-- Backward-compatible three-argument entry point.
CREATE OR REPLACE FUNCTION public.get_zune_delivery_quote(p_country text,p_region text,p_district text)
RETURNS TABLE(found boolean, pricing_id uuid, base_fee numeric, price_per_km numeric, minimum_fee numeric, currency text, matched_level text)
LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
  SELECT * FROM public.get_zune_delivery_quote(p_country,p_region,p_district,NULL::text);
$function$;

-- Patch the existing RPC definitions while preserving their checkout safeguards.
DO $migration$
DECLARE v_def text;
BEGIN
  v_def:=pg_get_functiondef('public.zune_create_checkout(jsonb,jsonb,text,text)'::regprocedure);
  v_def:=replace(v_def,
    'SELECT * INTO v_quote FROM public.get_zune_delivery_quote(v_country,v_region,v_district);',
    'SELECT * INTO v_quote FROM public.get_zune_delivery_quote(v_country,v_region,v_district,v_ward);');
  IF v_def NOT LIKE '%get_zune_delivery_quote(v_country,v_region,v_district,v_ward)%' THEN
    RAISE EXCEPTION 'Could not patch zune_create_checkout';
  END IF;
  EXECUTE v_def;

  v_def:=pg_get_functiondef('public.zune_quote_checkout(jsonb,jsonb,text)'::regprocedure);
  v_def:=replace(v_def,'v_country text; v_region text; v_district text;','v_country text; v_region text; v_district text; v_ward text;');
  v_def:=replace(v_def,
    'v_district:=trim(coalesce(p_address->>''district'',''''));',
    'v_district:=trim(coalesce(p_address->>''district'',''''));v_ward:=nullif(trim(coalesce(p_address->>''ward'','''')) ,'''');');
  v_def:=replace(v_def,'public.get_zune_delivery_quote(v_country,v_region,v_district)','public.get_zune_delivery_quote(v_country,v_region,v_district,v_ward)');
  IF v_def NOT LIKE '%v_ward%' OR v_def NOT LIKE '%get_zune_delivery_quote(v_country,v_region,v_district,v_ward)%' THEN
    RAISE EXCEPTION 'Could not patch zune_quote_checkout';
  END IF;
  EXECUTE v_def;
END;
$migration$;
