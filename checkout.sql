-- Admin-managed coupon redemption, enforced atomically by checkout RPC.
ALTER TABLE public.order_checkouts ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES public.coupons(id);
ALTER TABLE public.order_checkouts ADD COLUMN IF NOT EXISTS discount_total numeric NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 coupon_id uuid NOT NULL REFERENCES public.coupons(id),
 buyer_id uuid NOT NULL REFERENCES auth.users(id),
 checkout_id uuid NOT NULL REFERENCES public.order_checkouts(id) ON DELETE CASCADE,
 discount_amount numeric NOT NULL CHECK(discount_amount>=0),
 created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coupon_redemptions_one_per_checkout UNIQUE(checkout_id)
);
ALTER TABLE public.coupon_redemptions DROP CONSTRAINT IF EXISTS coupon_redemptions_one_per_buyer;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS coupon_redemptions_buyer_read_own ON public.coupon_redemptions;
CREATE POLICY coupon_redemptions_buyer_read_own ON public.coupon_redemptions FOR SELECT TO authenticated USING (buyer_id=auth.uid());
DROP POLICY IF EXISTS coupon_redemptions_admin_read ON public.coupon_redemptions;
CREATE POLICY coupon_redemptions_admin_read ON public.coupon_redemptions FOR SELECT TO authenticated USING (zune_is_admin());

-- ZUNE Marketplace atomic checkout (payment collection remains a separate phase)
ALTER TABLE public.order_checkouts ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS order_checkouts_buyer_idempotency_uidx
 ON public.order_checkouts (buyer_id, idempotency_key)
 WHERE idempotency_key IS NOT NULL;

DROP FUNCTION IF EXISTS public.zune_create_checkout(jsonb,jsonb,text,text);
DROP FUNCTION IF EXISTS public.zune_create_checkout(jsonb,jsonb,text);
CREATE FUNCTION public.zune_create_checkout(
 p_items jsonb,
 p_address jsonb,
 p_idempotency_key text,
 p_coupon_code text DEFAULT NULL
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
 v_coupon public.coupons%ROWTYPE;
 v_coupon_id uuid;
 v_discount numeric := 0;
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
   'subtotal',oc.subtotal,'delivery_total',oc.delivery_total,'discount_total',oc.discount_total,'grand_total',oc.grand_total,
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

 IF nullif(trim(coalesce(p_coupon_code,'')),'') IS NOT NULL THEN
  SELECT * INTO v_coupon FROM public.coupons
   WHERE upper(code)=upper(trim(p_coupon_code)) AND lower(status)='active'
    AND starts_at<=now() AND (expires_at IS NULL OR expires_at>now())
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Coupon si sahihi au muda wake umeisha.'; END IF;
  IF v_coupon.usage_limit IS NOT NULL AND v_coupon.usage_count>=v_coupon.usage_limit THEN RAISE EXCEPTION 'Coupon imefikia kikomo cha matumizi.'; END IF;
  IF v_subtotal<coalesce(v_coupon.min_order_amount,0) THEN RAISE EXCEPTION 'Jumla ya bidhaa haijafikia kiwango cha chini cha coupon.'; END IF;
  IF lower(v_coupon.discount_type)='percentage' THEN v_discount:=v_subtotal*v_coupon.discount_value/100;
  ELSE v_discount:=v_coupon.discount_value; END IF;
  IF v_coupon.max_discount_amount IS NOT NULL THEN v_discount:=least(v_discount,v_coupon.max_discount_amount); END IF;
  v_discount:=least(greatest(v_discount,0),v_subtotal);
  v_coupon_id:=v_coupon.id;
 END IF;

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
  delivery_address,latitude,longitude,subtotal,delivery_total,discount_total,grand_total,payment_method,status,idempotency_key,coupon_id
 ) VALUES (
  v_buyer,v_recipient,v_phone,nullif(trim(coalesce(p_address->>'email','')),''),
  v_country,v_region,v_district,v_ward,v_delivery_address,
  nullif(p_address->>'latitude','')::double precision,
  nullif(p_address->>'longitude','')::double precision,
  v_subtotal,v_delivery_total,v_discount,v_subtotal+v_delivery_total-v_discount,v_payment_method,'pending',p_idempotency_key,v_coupon_id
 ) RETURNING id INTO v_checkout_id;

 IF v_coupon_id IS NOT NULL THEN
  INSERT INTO public.coupon_redemptions(coupon_id,buyer_id,checkout_id,discount_amount)
  VALUES(v_coupon_id,v_buyer,v_checkout_id,v_discount);
  UPDATE public.coupons SET usage_count=usage_count+1,updated_at=now() WHERE id=v_coupon_id;
 END IF;

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
   recipient_email,delivery_method,checkout_id,payment_status,stock_deducted
  ) VALUES (
   v_buyer,v_product.id,v_quantity,v_product.price*v_quantity,0,v_recipient,v_phone,
   v_delivery_address,v_region,v_district,v_payment_method,
   nullif(trim(coalesce(p_address->>'delivery_notes','')),''),
   nullif(trim(coalesce(p_address->>'email','')),''),
   'standard',v_checkout_id,'pending',true
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
  'subtotal',v_subtotal,'delivery_total',v_delivery_total,'discount_total',v_discount,
  'grand_total',v_subtotal+v_delivery_total-v_discount,'reused',false
 );
END;
$$;

REVOKE ALL ON FUNCTION public.zune_create_checkout(jsonb,jsonb,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.zune_create_checkout(jsonb,jsonb,text,text) TO authenticated;


-- Preview delivery quote before order placement
DROP FUNCTION IF EXISTS public.zune_quote_checkout(jsonb,jsonb,text);
DROP FUNCTION IF EXISTS public.zune_quote_checkout(jsonb,jsonb);
CREATE FUNCTION public.zune_quote_checkout(p_items jsonb,p_address jsonb,p_coupon_code text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
 v_buyer uuid:=auth.uid(); v_item jsonb; v_product public.products%ROWTYPE;
 v_qty integer; v_subtotal numeric:=0; v_vendors integer; v_quote record;
 v_fee numeric; v_delivery numeric:=0; v_country text; v_region text; v_district text;
 v_coupon public.coupons%ROWTYPE; v_discount numeric:=0;
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
 IF nullif(trim(coalesce(p_coupon_code,'')),'') IS NOT NULL THEN
  SELECT * INTO v_coupon FROM public.coupons
   WHERE upper(code)=upper(trim(p_coupon_code)) AND lower(status)='active'
    AND starts_at<=now() AND (expires_at IS NULL OR expires_at>now());
  IF NOT FOUND THEN RETURN jsonb_build_object('ready',false,'message','Coupon si sahihi au muda wake umeisha.'); END IF;
  IF v_coupon.usage_limit IS NOT NULL AND v_coupon.usage_count>=v_coupon.usage_limit THEN RETURN jsonb_build_object('ready',false,'message','Coupon imefikia kikomo cha matumizi.'); END IF;
  IF v_subtotal<coalesce(v_coupon.min_order_amount,0) THEN RETURN jsonb_build_object('ready',false,'message','Jumla ya bidhaa haijafikia kiwango cha chini cha coupon.'); END IF;
  IF lower(v_coupon.discount_type)='percentage' THEN v_discount:=v_subtotal*v_coupon.discount_value/100;
  ELSE v_discount:=v_coupon.discount_value; END IF;
  IF v_coupon.max_discount_amount IS NOT NULL THEN v_discount:=least(v_discount,v_coupon.max_discount_amount); END IF;
  v_discount:=least(greatest(v_discount,0),v_subtotal);
 END IF;
 SELECT count(DISTINCT p.vendor_id) INTO v_vendors FROM jsonb_array_elements(p_items) i JOIN public.products p ON p.id=(i->>'product_id')::uuid;
 SELECT * INTO v_quote FROM public.get_zune_delivery_quote(v_country,v_region,v_district);
 IF NOT coalesce(v_quote.found,false) THEN RETURN jsonb_build_object('ready',false,'message','Gharama ya delivery haijawekwa kwa eneo hili. Tafadhali wasiliana na Support.'); END IF;
 v_fee:=greatest(coalesce(v_quote.base_fee,0),coalesce(v_quote.minimum_fee,0));
 v_delivery:=v_fee*v_vendors;
 RETURN jsonb_build_object('ready',true,'subtotal',v_subtotal,'delivery_total',v_delivery,'discount_total',v_discount,'grand_total',v_subtotal+v_delivery-v_discount,'seller_count',v_vendors,'currency',coalesce(v_quote.currency,'TZS'));
END; $$;
REVOKE ALL ON FUNCTION public.zune_quote_checkout(jsonb,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.zune_quote_checkout(jsonb,jsonb,text) TO authenticated;


-- Track stock deducted by this atomic checkout and restore it on Admin cancellation.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stock_deducted boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.zune_restore_stock_on_order_cancel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $zune$
DECLARE v_total integer; v_completed integer; v_cancelled integer; v_confirmed integer;
BEGIN
 IF OLD.status::text IS DISTINCT FROM 'cancelled'
    AND NEW.status::text='cancelled'
    AND coalesce(OLD.stock_deducted,false)=true THEN
  UPDATE public.products SET stock_quantity=coalesce(stock_quantity,0)+OLD.quantity
   WHERE id=OLD.product_id;
  UPDATE public.orders SET stock_deducted=false WHERE id=OLD.id;
 END IF;
 IF NEW.checkout_id IS NOT NULL THEN
  SELECT count(*),
   count(*) FILTER(WHERE status::text='completed'),
   count(*) FILTER(WHERE status::text='cancelled'),
   count(*) FILTER(WHERE status::text='confirmed')
  INTO v_total,v_completed,v_cancelled,v_confirmed
  FROM public.orders WHERE checkout_id=NEW.checkout_id;
  UPDATE public.order_checkouts SET status=CASE
   WHEN v_total>0 AND v_completed=v_total THEN 'completed'
   WHEN v_total>0 AND v_cancelled=v_total THEN 'cancelled'
   WHEN v_confirmed>0 OR v_completed>0 THEN 'confirmed'
   ELSE 'pending' END
  WHERE id=NEW.checkout_id;
 END IF;
 RETURN NEW;
END; $zune$;
DROP TRIGGER IF EXISTS zune_restore_stock_on_order_cancel ON public.orders;
CREATE TRIGGER zune_restore_stock_on_order_cancel
 AFTER UPDATE OF status ON public.orders
 FOR EACH ROW EXECUTE FUNCTION public.zune_restore_stock_on_order_cancel();
