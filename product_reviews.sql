-- Product reviews with verified-purchase eligibility and Admin moderation
CREATE TABLE IF NOT EXISTS public.product_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
 buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
 rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
 review_text text NOT NULL DEFAULT '',
 moderation_status text NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending','approved','rejected')),
 is_visible boolean NOT NULL DEFAULT false,
 admin_note text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT product_reviews_one_per_order_product UNIQUE (buyer_id,order_id,product_id)
);
CREATE INDEX IF NOT EXISTS product_reviews_product_visible_idx ON public.product_reviews(product_id,moderation_status,is_visible,created_at DESC);
CREATE INDEX IF NOT EXISTS product_reviews_seller_product_idx ON public.product_reviews(product_id,created_at DESC);
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_reviews_public_read_approved ON public.product_reviews;
CREATE POLICY product_reviews_public_read_approved ON public.product_reviews FOR SELECT TO anon,authenticated USING (moderation_status='approved' AND is_visible=true);
DROP POLICY IF EXISTS product_reviews_buyer_read_own ON public.product_reviews;
CREATE POLICY product_reviews_buyer_read_own ON public.product_reviews FOR SELECT TO authenticated USING (buyer_id=auth.uid());
DROP POLICY IF EXISTS product_reviews_seller_read_own_products ON public.product_reviews;
CREATE POLICY product_reviews_seller_read_own_products ON public.product_reviews FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id=product_reviews.product_id AND p.vendor_id=auth.uid()));
DROP POLICY IF EXISTS product_reviews_buyer_create_verified_purchase ON public.product_reviews;
CREATE POLICY product_reviews_buyer_create_verified_purchase ON public.product_reviews FOR INSERT TO authenticated WITH CHECK (
 buyer_id=auth.uid() AND moderation_status='pending' AND is_visible=false
 AND EXISTS (
  SELECT 1 FROM public.orders o
  JOIN public.order_items oi ON oi.order_id=o.id
  WHERE o.id=product_reviews.order_id AND o.buyer_id=auth.uid()
   AND o.status::text='completed' AND oi.product_id=product_reviews.product_id
 )
);
DROP POLICY IF EXISTS product_reviews_admin_manage ON public.product_reviews;
CREATE POLICY product_reviews_admin_manage ON public.product_reviews FOR ALL TO authenticated USING (zune_is_admin()) WITH CHECK (zune_is_admin());

ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES auth.users(id);
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS moderated_at timestamptz;
