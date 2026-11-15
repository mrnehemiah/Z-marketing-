-- ZUNE Marketplace atomic checkout (payment collection remains a separate phase)
ALTER TABLE public.order_checkouts ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS order_checkouts_buyer_idempotency_uidx
 ON public.order_checkouts (buyer_id, idempotency_key)
 WHERE idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.zune_create_checkout(
 p_items jsonb,
 p_address jsonb,
 p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
 v_buyer uuid := auth.uid();
 v_checkout_id uuid;
 v_existing jsonb;
 v_item jsonb;
 v_product public.products%ROWTYPE;
 v_quantity integer;
 v_subtotal numeric := 0;
 v_delivery_total numeric := 0;
 v_vendor uuid;
 v_quote record;
 v_fee numeric;
 v_order_id uuid;
 v_order_ids uuid[] := ARRAY[]::uuid[];
 v_delivery_address text;
 v_recipient text;
 v_phone text;
 v_country text;
 v_region text;
 v_district text;
 v_ward text;
 v_payment_method text := 'cash_on_delivery';
 v_seller_location uuid;
BEGIN
 IF v_buyer IS NULL THEN RAISE EXCEPTION 'Tafadhali ingia kwanza.'; END IF;
 IF p_address IS NULL OR jsonb_typeof(p_address) <> 'object' THEN RAISE EXCEPTION 'Anwani ya kufikishiwa si sahihi.'; END IF;
 IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) < 12 OR length(p_idempotency_key) > 120 THEN
  RAISE EXCEPTION 'Checkout reference si sahihi.';
 END IF;
 IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) < 1 OR jsonb_array_length(p_items) > 50 THEN
  RAISE EXCEPTION 'Kikapu hakina bidhaa sahihi.';
 END IF;
 v_recipient := trim(coalesce(p_address->>'recipient_name',''));
 v_phone := trim(coalesce(p_address->>'phone',''));
 v_country := trim(coalesce(p_address->>'country',''));
 v_region := trim(coalesce(p_address->>'region',''));
 v_district := trim(coalesce(p_address->>'district',''));
 v_ward := nullif(trim(coalesce(p_address->>'ward','')),'');
 v_delivery_address := trim(concat_ws(', ',
   nullif(trim(coalesce(p_address->>'street','')),''),
   nullif(trim(coalesce(p_address->>'landmark','')),''),
   v_ward, v_district, v_region, v_country
 ));
 IF v_recipient='' OR v_phone='' OR v_country='' OR v_region='' OR v_district='' OR v_delivery_address='' THEN
  RAISE EXCEPTION 'Jaza jina, simu, nchi, mkoa, wilaya na anwani ya kufikishiwa.';
 END IF;

 SELECT id INTO v_checkout_id FROM public.order_checkouts
 WHERE buyer_id=v_buyer AND idempotency_key=p_idempotency_key LIMIT 1;
 IF v_checkout_id IS NOT NULL THEN
  SELECT jsonb_build_object(
   'checkout_id',v_checkout_id,
   'order_ids',coalesce(jsonb_agg(o.id),'[]'::jsonb),
   'subtotal',oc.subtotal,'delivery_total',oc.delivery_total,'grand_total',oc.grand_total,
   'reused',true
  ) INTO v_existing
  FROM public.order_checkouts oc
  LEFT JOIN public.orders o ON o.checkout_id=oc.id
  WHERE oc.id=v_checkout_id
  GROUP BY oc.id;
  RETURN v_existing;
 END IF;

 -- Validate every product, lock stock rows, and calculate authoritative subtotal.
 FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
 LOOP
  IF (v_item->>'product_id') IS NULL OR coalesce(v_item->>'quantity','') !~ '^[0-9]+$' THEN
   RAISE EXCEPTION 'Bidhaa au idadi si sahihi.';
  END IF;
  v_quantity := (v_item->>'quantity')::integer;
  IF v_quantity < 1 OR v_quantity > 99 THEN RAISE EXCEPTION 'Idadi ya bidhaa si sahihi.'; END IF;
  SELECT * INTO v_product FROM public.products
   WHERE id=(v_item->>'product_id')::uuid
   FOR UPDATE;
  IF NOT FOUND OR v_product.moderation_status <> 'approved' OR v_product.removed_at IS NOT NULL THEN
   RAISE EXCEPTION 'Bidhaa haipatikani au haijaidhinishwa tena.';
  END IF;
  IF coalesce(v_product.stock_quantity,0) < v_quantity THEN
   RAISE EXCEPTION 'Stock haitoshi kwa bidhaa: %',v_product.title;
  END IF;
  v_subtotal := v_subtotal + (v_product.price * v_quantity);
 END LOOP;

 -- Delivery quote is configured by Admin for each destination and seller.
 FOR v_vendor IN
  SELECT DISTINCT p.vendor_id
  FROM jsonb_array_elements(p_items) i
  JOIN public.products p ON p.id=(i->>'product_id')::uuid
  ORDER BY p.vendor_id
 LOOP
  SELECT * INTO v_quote FROM public.get_zune_delivery_quote(v_country,v_region,v_district);
  IF NOT coalesce(v_quote.found,false) THEN
   RAISE EXCEPTION 'Gharama ya delivery haijawekwa kwa eneo hili. Tafadhali wasiliana na Support.';
  END IF;
  v_fee := greatest(coalesce(v_quote.base_fee,0),coalesce(v_quote.minimum_fee,0));
  v_delivery_total := v_delivery_total + v_fee;
 END LOOP;

 INSERT INTO public.order_checkouts(
  buyer_id,recipient_name,recipient_phone,recipient_email,country,region,district,ward,
  delivery_address,latitude,longitude,subtotal,delivery_total,grand_total,payment_method,status,idempotency_key
 ) VALUES (
  v_buyer,v_recipient,v_phone,nullif(trim(coalesce(p_address->>'email','')),''),
  v_country,v_region,v_district,v_ward,v_delivery_address,
  nullif(p_address->>'latitude','')::double precision,
  nullif(p_address->>'longitude','')::double precision,
  v_subtotal,v_delivery_total,v_subtotal+v_delivery_total,v_payment_method,'pending',p_idempotency_key
 ) RETURNING id INTO v_checkout_id;

 -- Create one order per product to preserve existing Seller and Admin order workflows.
 FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
 LOOP
  v_quantity := (v_item->>'quantity')::integer;
  SELECT * INTO v_product FROM public.products
   WHERE id=(v_item->>'product_id')::uuid
   FOR UPDATE;
  INSERT INTO public.orders(
   buyer_id,product_id,quantity,total_price,commission_fee,recipient_name,recipient_phone,
   delivery_address,delivery_region,delivery_district,payment_method,delivery_notes,
   recipient_email,delivery_method,checkout_id,payment_status
  ) VALUES (
   v_buyer,v_product.id,v_quantity,v_product.price*v_quantity,0,v_recipient,v_phone,
   v_delivery_address,v_region,v_district,v_payment_method,
   nullif(trim(coalesce(p_address->>'delivery_notes','')),''),
   nullif(trim(coalesce(p_address->>'email','')),''),
   'standard',v_checkout_id,'pending'
  ) RETURNING id INTO v_order_id;
  INSERT INTO public.order_items(order_id,product_id,product_name,price,quantity,seller_id)
  VALUES(v_order_id,v_product.id,v_product.title,v_product.price,v_quantity,v_product.vendor_id);
  UPDATE public.products SET stock_quantity=stock_quantity-v_quantity WHERE id=v_product.id;
  v_order_ids := array_append(v_order_ids,v_order_id);
 END LOOP;

 -- Persist a per-seller delivery row for Seller Dashboard and tracking.
 FOR v_vendor IN
  SELECT DISTINCT p.vendor_id
  FROM jsonb_array_elements(p_items) i
  JOIN public.products p ON p.id=(i->>'product_id')::uuid
  ORDER BY p.vendor_id
 LOOP
  SELECT * INTO v_quote FROM public.get_zune_delivery_quote(v_country,v_region,v_district);
  v_fee := greatest(coalesce(v_quote.base_fee,0),coalesce(v_quote.minimum_fee,0));
  SELECT id INTO v_seller_location FROM public.seller_locations
   WHERE vendor_id=v_vendor AND is_active=true
    AND lower(region)=lower(v_region) AND lower(district)=lower(v_district)
   ORDER BY created_at DESC LIMIT 1;
  INSERT INTO public.order_deliveries(
   checkout_id,vendor_id,seller_location_id,base_fee,price_per_km,minimum_fee,delivery_fee,currency,status
  ) VALUES (
   v_checkout_id,v_vendor,v_seller_location,coalesce(v_quote.base_fee,0),
   coalesce(v_quote.price_per_km,0),coalesce(v_quote.minimum_fee,0),v_fee,
   coalesce(v_quote.currency,'TZS'),'pending'
  );
 END LOOP;

 RETURN jsonb_build_object(
  'checkout_id',v_checkout_id,'order_ids',to_jsonb(v_order_ids),
  'subtotal',v_subtotal,'delivery_total',v_delivery_total,
  'grand_total',v_subtotal+v_delivery_total,'reused',false
 );
END;
$$;

REVOKE ALL ON FUNCTION public.zune_create_checkout(jsonb,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.zune_create_checkout(jsonb,jsonb,text) TO authenticated;


-- Preview delivery quote before order placement
CREATE OR REPLACE FUNCTION public.zune_quote_checkout(p_items jsonb,p_address jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
 v_buyer uuid:=auth.uid(); v_item jsonb; v_product public.products%ROWTYPE;
 v_qty integer; v_subtotal numeric:=0; v_vendors integer; v_quote record;
 v_fee numeric; v_delivery numeric:=0; v_country text; v_region text; v_district text;
BEGIN
 IF v_buyer IS NULL THEN RAISE EXCEPTION 'Tafadhali ingia kwanza.'; END IF;
 IF p_address IS NULL OR jsonb_typeof(p_address) <> 'object' THEN RAISE EXCEPTION 'Anwani ya kufikishiwa si sahihi.'; END IF;
 IF p_items IS NULL OR jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items)<1 OR jsonb_array_length(p_items)>50 THEN RAISE EXCEPTION 'Kikapu hakina bidhaa sahihi.'; END IF;
 v_country:=trim(coalesce(p_address->>'country',''));v_region:=trim(coalesce(p_address->>'region',''));v_district:=trim(coalesce(p_address->>'district',''));
 IF v_country='' OR v_region='' OR v_district='' THEN RETURN jsonb_build_object('ready',false,'message','Jaza nchi, mkoa na wilaya ili kukokotoa delivery.'); END IF;
 FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
  IF coalesce(v_item->>'quantity','') !~ '^[0-9]+$' THEN RAISE EXCEPTION 'Idadi ya bidhaa si sahihi.'; END IF;
  v_qty:=(v_item->>'quantity')::integer;
  IF v_qty<1 OR v_qty>99 THEN RAISE EXCEPTION 'Idadi ya bidhaa si sahihi.'; END IF;
  SELECT * INTO v_product FROM public.products WHERE id=(v_item->>'product_id')::uuid;
  IF NOT FOUND OR v_product.moderation_status<>'approved' OR v_product.removed_at IS NOT NULL THEN RAISE EXCEPTION 'Bidhaa haipatikani tena.'; END IF;
  IF coalesce(v_product.stock_quantity,0)<v_qty THEN RAISE EXCEPTION 'Stock haitoshi kwa bidhaa: %',v_product.title; END IF;
  v_subtotal:=v_subtotal+v_product.price*v_qty;
 END LOOP;
 SELECT count(DISTINCT p.vendor_id) INTO v_vendors FROM jsonb_array_elements(p_items) i JOIN public.products p ON p.id=(i->>'product_id')::uuid;
 SELECT * INTO v_quote FROM public.get_zune_delivery_quote(v_country,v_region,v_district);
 IF NOT coalesce(v_quote.found,false) THEN RETURN jsonb_build_object('ready',false,'message','Gharama ya delivery haijawekwa kwa eneo hili. Tafadhali wasiliana na Support.'); END IF;
 v_fee:=greatest(coalesce(v_quote.base_fee,0),coalesce(v_quote.minimum_fee,0));
 v_delivery:=v_fee*v_vendors;
 RETURN jsonb_build_object('ready',true,'subtotal',v_subtotal,'delivery_total',v_delivery,'grand_total',v_subtotal+v_delivery,'seller_count',v_vendors,'currency',coalesce(v_quote.currency,'TZS'));
END; $$;
REVOKE ALL ON FUNCTION public.zune_quote_checkout(jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.zune_quote_checkout(jsonb,jsonb) TO authenticated;
