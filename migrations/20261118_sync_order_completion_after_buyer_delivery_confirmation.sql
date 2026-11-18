-- Order completion is driven by buyer delivery confirmation, never by manual seller/Admin status changes.
CREATE OR REPLACE FUNCTION public.zune_guard_seller_order_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF NEW.status::text = 'completed'
     AND OLD.status::text IS DISTINCT FROM 'completed'
     AND coalesce(current_setting('zune.delivery_completion', true), '') <> 'on' THEN
    RAISE EXCEPTION 'Order completion requires buyer delivery confirmation.'
      USING ERRCODE = '42501';
  END IF;

  IF auth.uid() IS NOT NULL AND NOT public.zune_is_admin() THEN
    IF (to_jsonb(NEW) - 'status') IS DISTINCT FROM (to_jsonb(OLD) - 'status') THEN
      RAISE EXCEPTION 'Sellers may only update order status.';
    END IF;
    IF NEW.status::text IS DISTINCT FROM OLD.status::text
       AND NOT (
         (OLD.status::text = 'pending' AND NEW.status::text IN ('confirmed','cancelled'))
         OR (OLD.status::text = 'confirmed' AND NEW.status::text = 'cancelled')
         OR (
           OLD.status::text IN ('pending','confirmed')
           AND NEW.status::text = 'completed'
           AND coalesce(current_setting('zune.delivery_completion', true), '') = 'on'
         )
       ) THEN
      RAISE EXCEPTION 'Invalid seller order status transition.'
        USING ERRCODE = '22023';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.zune_delivery_buyer_confirm_received(
  p_delivery_id uuid,
  p_note text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  d public.order_deliveries%rowtype;
  v_buyer uuid;
  v_orders_completed integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Tafadhali ingia kwanza.';
  END IF;
  SELECT * INTO d FROM public.order_deliveries WHERE id = p_delivery_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery haijapatikana.'; END IF;
  SELECT buyer_id INTO v_buyer FROM public.order_checkouts WHERE id = d.checkout_id;
  IF v_buyer IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Mnunuzi wa oda hii pekee ndiye anayeweza kuthibitisha kupokea.';
  END IF;
  IF d.status <> 'delivered' OR d.driver_delivered_at IS NULL THEN
    RAISE EXCEPTION 'Dereva lazima athibitishe kufikisha mzigo kwanza.';
  END IF;

  UPDATE public.order_deliveries
  SET status = 'completed', buyer_confirmed_at = now(), payout_status = 'awaiting_allocation'
  WHERE id = p_delivery_id;

  INSERT INTO public.zune_delivery_events(delivery_id, actor_id, event_type, note)
  VALUES (p_delivery_id, auth.uid(), 'buyer_confirmed_received', nullif(trim(coalesce(p_note, '')), ''));

  PERFORM set_config('zune.delivery_completion', 'on', true);
  UPDATE public.orders o
  SET status = 'completed'
  WHERE o.checkout_id = d.checkout_id
    AND o.status::text IN ('pending', 'confirmed')
    AND (
      EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = o.id AND oi.seller_id = d.vendor_id)
      OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = o.product_id AND p.vendor_id = d.vendor_id)
    );
  GET DIAGNOSTICS v_orders_completed = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true,
    'status', 'completed',
    'orders_completed', v_orders_completed,
    'payout_status', 'awaiting_allocation',
    'message', 'Mnunuzi amethibitisha kupokea. Oda za duka hili zimekamilika; mgawanyo wa malipo unasubiri kanuni za malipo za ZUNE.'
  );
END;
$function$;
