-- Make seller delivery RPCs resolve the owner behind the isolated Seller Portal identity.
-- Add an Admin-only review RPC for ZUNE Delivery driver applications.

CREATE OR REPLACE FUNCTION public.zune_delivery_active_drivers()
RETURNS TABLE(driver_id uuid, full_name text, phone_number text, vehicle_type text, vehicle_registration text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE v_owner uuid := public.zune_seller_owner_id();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Tafadhali ingia kwanza.'; END IF;
  IF NOT public.zune_is_admin()
     AND NOT EXISTS (SELECT 1 FROM public.order_deliveries x WHERE x.vendor_id = v_owner)
     AND NOT EXISTS (SELECT 1 FROM public.products p WHERE p.vendor_id = v_owner)
     AND NOT EXISTS (SELECT 1 FROM public.stores s WHERE s.owner_id = v_owner) THEN
    RAISE EXCEPTION 'Akaunti hii haina ruhusa ya kuona madereva.';
  END IF;
  RETURN QUERY SELECT p.user_id,p.full_name,p.phone_number,p.vehicle_type,p.vehicle_registration
    FROM public.delivery_driver_profiles p WHERE p.status = 'active' ORDER BY p.full_name;
END;
$function$;

CREATE OR REPLACE FUNCTION public.zune_delivery_assign_driver(p_delivery_id uuid, p_driver_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE d public.order_deliveries%rowtype; v_owner uuid := public.zune_seller_owner_id();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Tafadhali ingia kwanza.'; END IF;
  SELECT * INTO d FROM public.order_deliveries WHERE id = p_delivery_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery haijapatikana.'; END IF;
  IF d.vendor_id <> v_owner AND NOT public.zune_is_admin() THEN RAISE EXCEPTION 'Huna ruhusa ya kupanga dereva wa oda hii.'; END IF;
  IF d.status NOT IN ('pending','assigned') OR d.seller_handover_confirmed_at IS NOT NULL THEN RAISE EXCEPTION 'Dereva hawezi kubadilishwa baada ya makabidhiano.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.delivery_driver_profiles p WHERE p.user_id = p_driver_id AND p.status = 'active') THEN
    RAISE EXCEPTION 'Dereva hajathibitishwa au akaunti yake haipo hai.';
  END IF;
  UPDATE public.order_deliveries SET assigned_driver_id = p_driver_id, status = 'assigned' WHERE id = p_delivery_id;
  INSERT INTO public.zune_delivery_events(delivery_id,actor_id,event_type,note)
    VALUES (p_delivery_id,auth.uid(),'driver_assigned','Muuzaji amemchagua dereva.');
  RETURN jsonb_build_object('ok',true,'delivery_id',p_delivery_id,'driver_id',p_driver_id,'status','assigned');
END;
$function$;

CREATE OR REPLACE FUNCTION public.zune_delivery_seller_handover(p_delivery_id uuid, p_note text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE d public.order_deliveries%rowtype; v_owner uuid := public.zune_seller_owner_id();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Tafadhali ingia kwanza.'; END IF;
  SELECT * INTO d FROM public.order_deliveries WHERE id = p_delivery_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery haijapatikana.'; END IF;
  IF d.vendor_id <> v_owner AND NOT public.zune_is_admin() THEN RAISE EXCEPTION 'Muuzaji huyu hana ruhusa ya oda hii.'; END IF;
  IF d.assigned_driver_id IS NULL THEN RAISE EXCEPTION 'Chagua dereva kabla ya kukabidhi mzigo.'; END IF;
  IF d.status <> 'assigned' THEN RAISE EXCEPTION 'Oda haipo kwenye hatua ya kukabidhiwa.'; END IF;
  UPDATE public.order_deliveries SET seller_handover_confirmed_at = now(), status = 'ready_for_pickup' WHERE id = p_delivery_id;
  INSERT INTO public.zune_delivery_events(delivery_id,actor_id,event_type,note)
    VALUES (p_delivery_id,auth.uid(),'seller_handover_confirmed',nullif(trim(coalesce(p_note,'')),''));
  RETURN jsonb_build_object('ok',true,'status','ready_for_pickup');
END;
$function$;

CREATE OR REPLACE FUNCTION public.zune_delivery_seller_queue()
RETURNS TABLE(delivery_id uuid, checkout_id uuid, vendor_id uuid, delivery_fee numeric, currency text,
  delivery_status text, assigned_driver_id uuid, seller_handover_confirmed_at timestamptz,
  driver_pickup_confirmed_at timestamptz, driver_delivered_at timestamptz, buyer_confirmed_at timestamptz,
  payout_status text, recipient_name text, recipient_phone text, delivery_address text, region text, district text,
  latitude double precision, longitude double precision, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE v_owner uuid := public.zune_seller_owner_id();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Tafadhali ingia kwanza.'; END IF;
  IF NOT public.zune_is_admin()
     AND NOT EXISTS (SELECT 1 FROM public.order_deliveries x WHERE x.vendor_id = v_owner)
     AND NOT EXISTS (SELECT 1 FROM public.products p WHERE p.vendor_id = v_owner)
     AND NOT EXISTS (SELECT 1 FROM public.stores s WHERE s.owner_id = v_owner) THEN
    RAISE EXCEPTION 'Akaunti hii haina duka linaloweza kusimamia delivery.';
  END IF;
  RETURN QUERY SELECT d.id,d.checkout_id,d.vendor_id,d.delivery_fee,d.currency,d.status,d.assigned_driver_id,
    d.seller_handover_confirmed_at,d.driver_pickup_confirmed_at,d.driver_delivered_at,d.buyer_confirmed_at,
    d.payout_status,c.recipient_name,c.recipient_phone,c.delivery_address,c.region,c.district,c.latitude,c.longitude,d.created_at
    FROM public.order_deliveries d JOIN public.order_checkouts c ON c.id = d.checkout_id
    WHERE public.zune_is_admin() OR d.vendor_id = v_owner ORDER BY d.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.zune_delivery_seller_tracking()
RETURNS TABLE(delivery_id uuid, delivery_status text, assigned_driver_id uuid, last_latitude double precision,
  last_longitude double precision, last_location_at timestamptz, destination_latitude double precision,
  destination_longitude double precision, recipient_name text, recipient_phone text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE v_owner uuid := public.zune_seller_owner_id();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Tafadhali ingia kwanza.'; END IF;
  RETURN QUERY SELECT d.id,d.status,d.assigned_driver_id,d.last_latitude,d.last_longitude,d.last_location_at,
    c.latitude,c.longitude,c.recipient_name,c.recipient_phone
    FROM public.order_deliveries d JOIN public.order_checkouts c ON c.id = d.checkout_id
    WHERE (public.zune_is_admin() OR d.vendor_id = v_owner) AND d.assigned_driver_id IS NOT NULL
    ORDER BY d.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_review_delivery_driver_application(p_application_id uuid,p_decision text,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE v_admin uuid; v_app public.delivery_driver_applications%rowtype;
BEGIN
  v_admin := public.zune_assert_admin(p_reason);
  IF p_decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Uamuzi si sahihi.' USING ERRCODE = '22023'; END IF;
  SELECT * INTO v_app FROM public.delivery_driver_applications WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ombi la dereva halijapatikana.'; END IF;
  IF v_app.status <> 'pending' THEN RAISE EXCEPTION 'Ombi hili limeshakaguliwa.'; END IF;
  UPDATE public.delivery_driver_profiles
    SET status = CASE WHEN p_decision = 'approved' THEN 'active' ELSE 'rejected' END,
        approved_by = CASE WHEN p_decision = 'approved' THEN v_admin ELSE NULL END,
        approved_at = CASE WHEN p_decision = 'approved' THEN now() ELSE NULL END,
        rejection_reason = CASE WHEN p_decision = 'rejected' THEN btrim(p_reason) ELSE NULL END,
        updated_at = now()
    WHERE user_id = v_app.user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Taarifa za dereva hazijapatikana.'; END IF;
  UPDATE public.delivery_driver_applications
    SET status = p_decision, reviewed_at = now(), reviewed_by = v_admin, review_note = btrim(p_reason)
    WHERE id = p_application_id;
  INSERT INTO public.delivery_driver_audit_logs(driver_user_id,performed_by,action,reason)
    VALUES (v_app.user_id,v_admin,p_decision,btrim(p_reason));
  RETURN jsonb_build_object('ok',true,'application_id',p_application_id,'driver_user_id',v_app.user_id,'status',p_decision);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_review_delivery_driver_application(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_delivery_driver_application(uuid,text,text) TO authenticated;
