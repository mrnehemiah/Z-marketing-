-- ZUNE seller-scoped coupons (schema foundation).
-- Existing rows remain platform coupons; checkout RPC must enforce scope before seller coupons are activated.
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS coupon_scope text NOT NULL DEFAULT 'platform',
  ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS product_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS max_per_buyer integer;

ALTER TABLE public.coupons
  DROP CONSTRAINT IF EXISTS coupons_scope_check,
  ADD CONSTRAINT coupons_scope_check CHECK (
    (coupon_scope = 'platform' AND seller_id IS NULL)
    OR (coupon_scope = 'seller' AND seller_id IS NOT NULL)
  ),
  DROP CONSTRAINT IF EXISTS coupons_max_per_buyer_check,
  ADD CONSTRAINT coupons_max_per_buyer_check CHECK (max_per_buyer IS NULL OR max_per_buyer > 0);

CREATE INDEX IF NOT EXISTS coupons_seller_scope_idx
  ON public.coupons (seller_id, created_at DESC)
  WHERE coupon_scope = 'seller';

DROP POLICY IF EXISTS coupons_seller_read_own ON public.coupons;
CREATE POLICY coupons_seller_read_own ON public.coupons
  FOR SELECT TO authenticated
  USING (coupon_scope = 'seller' AND seller_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS coupons_seller_insert_own ON public.coupons;
CREATE POLICY coupons_seller_insert_own ON public.coupons
  FOR INSERT TO authenticated
  WITH CHECK (
    coupon_scope = 'seller'
    AND seller_id = (SELECT auth.uid())
    AND created_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'vendor'
    )
  );

DROP POLICY IF EXISTS coupons_seller_update_own ON public.coupons;
CREATE POLICY coupons_seller_update_own ON public.coupons
  FOR UPDATE TO authenticated
  USING (coupon_scope = 'seller' AND seller_id = (SELECT auth.uid()))
  WITH CHECK (
    coupon_scope = 'seller'
    AND seller_id = (SELECT auth.uid())
    AND created_by = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS coupons_seller_delete_own ON public.coupons;
CREATE POLICY coupons_seller_delete_own ON public.coupons
  FOR DELETE TO authenticated
  USING (coupon_scope = 'seller' AND seller_id = (SELECT auth.uid()));

-- Seller coupons are intentionally NOT enabled for checkout by this schema-only migration.
-- Apply the paired checkout RPC migration after the scope validation and per-seller discount
-- allocation logic has been installed and tested. This avoids a seller coupon discounting
-- another seller's items.
