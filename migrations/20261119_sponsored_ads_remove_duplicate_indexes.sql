-- Applied to the ZUNE Supabase project on 2026-11-19.
-- Remove duplicate indexes reported by Supabase performance advisors.
DROP INDEX IF EXISTS public.ad_campaigns_seller_idx;
DROP INDEX IF EXISTS public.ad_events_campaign_type_idx;
