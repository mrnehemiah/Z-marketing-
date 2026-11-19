-- Applied to the ZUNE Supabase project on 2026-11-19.
-- Cover Sponsored Ads foreign keys identified by the performance advisor.
CREATE INDEX IF NOT EXISTS private_ad_click_attributions_campaign_idx
  ON private.ad_click_attributions (campaign_id);
CREATE INDEX IF NOT EXISTS private_ad_click_attributions_product_idx
  ON private.ad_click_attributions (product_id);
CREATE INDEX IF NOT EXISTS ad_auction_bids_reviewed_by_idx
  ON public.ad_auction_bids (reviewed_by) WHERE reviewed_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS ad_system_settings_updated_by_idx
  ON public.ad_system_settings (updated_by) WHERE updated_by IS NOT NULL;
