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

-- Protect the address snapshot from Seller/customer-side order updates.
-- Admin retains correction authority through the existing Admin role helper.
CREATE OR REPLACE FUNCTION public.zune_protect_order_address_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NOT public.zune_is_admin() AND (
    OLD.recipient_name IS DISTINCT FROM NEW.recipient_name OR
    OLD.recipient_phone IS DISTINCT FROM NEW.recipient_phone OR
    OLD.delivery_address IS DISTINCT FROM NEW.delivery_address OR
    OLD.delivery_region IS DISTINCT FROM NEW.delivery_region OR
    OLD.delivery_district IS DISTINCT FROM NEW.delivery_district OR
    OLD.delivery_country IS DISTINCT FROM NEW.delivery_country OR
    OLD.delivery_ward IS DISTINCT FROM NEW.delivery_ward OR
    OLD.delivery_latitude IS DISTINCT FROM NEW.delivery_latitude OR
    OLD.delivery_longitude IS DISTINCT FROM NEW.delivery_longitude OR
    OLD.delivery_notes IS DISTINCT FROM NEW.delivery_notes
  ) THEN
    RAISE EXCEPTION 'Anwani ya oda iliyowekwa haiwezi kubadilishwa.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zune_order_address_immutable ON public.orders;
CREATE TRIGGER zune_order_address_immutable
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.zune_protect_order_address_snapshot();
