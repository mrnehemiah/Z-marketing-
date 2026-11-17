-- ZUNE customer delivery address snapshot for Seller and Admin order views.
-- The checkout RPC inserts order_checkouts before orders; this trigger copies the
-- immutable delivery coordinates and administrative area onto each order row.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_country text,
  ADD COLUMN IF NOT EXISTS delivery_ward text,
  ADD COLUMN IF NOT EXISTS delivery_latitude double precision,
  ADD COLUMN IF NOT EXISTS delivery_longitude double precision;

CREATE OR REPLACE FUNCTION public.zune_copy_checkout_address_to_order()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.checkout_id IS NOT NULL THEN
    SELECT oc.country, oc.ward, oc.latitude, oc.longitude
      INTO NEW.delivery_country, NEW.delivery_ward,
           NEW.delivery_latitude, NEW.delivery_longitude
    FROM public.order_checkouts oc
    WHERE oc.id = NEW.checkout_id
      AND oc.buyer_id = NEW.buyer_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zune_order_address_snapshot ON public.orders;
CREATE TRIGGER zune_order_address_snapshot
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.zune_copy_checkout_address_to_order();

CREATE INDEX IF NOT EXISTS orders_checkout_id_idx
  ON public.orders(checkout_id);
