-- Enforce a single order status state machine for buyers, sellers and Admin.
-- A completed order can only be produced by the buyer receipt confirmation RPC.
CREATE OR REPLACE FUNCTION public.zune_guard_seller_order_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF NEW.status::text IS DISTINCT FROM OLD.status::text THEN
    IF NEW.status::text = 'completed'
       AND coalesce(current_setting('zune.delivery_completion', true), '') <> 'on' THEN
      RAISE EXCEPTION 'Order completion requires buyer delivery confirmation.'
        USING ERRCODE = '42501';
    END IF;
    IF OLD.status::text IN ('completed','cancelled') THEN
      RAISE EXCEPTION 'Completed or cancelled orders are terminal.'
        USING ERRCODE = '22023';
    END IF;
    IF NOT (
      (OLD.status::text = 'pending' AND NEW.status::text IN ('confirmed','cancelled'))
      OR (OLD.status::text = 'confirmed' AND NEW.status::text = 'cancelled')
      OR (
        OLD.status::text IN ('pending','confirmed')
        AND NEW.status::text = 'completed'
        AND coalesce(current_setting('zune.delivery_completion', true), '') = 'on'
      )
    ) THEN
      RAISE EXCEPTION 'Invalid order status transition.'
        USING ERRCODE = '22023';
    END IF;
  END IF;
  IF auth.uid() IS NOT NULL AND NOT public.zune_is_admin() THEN
    IF (to_jsonb(NEW) - 'status') IS DISTINCT FROM (to_jsonb(OLD) - 'status') THEN
      RAISE EXCEPTION 'Sellers may only update order status.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
