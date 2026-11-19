-- Keep public Ads RPC endpoints as SECURITY INVOKER wrappers.

create or replace function private.zune_seller_place_ad_bid_impl(
 p_campaign_id uuid,p_bid_type text,p_bid_amount_tzs numeric,p_daily_budget_tzs numeric,p_seller_note text default null
) returns public.ad_auction_bids
language plpgsql security definer set search_path=''
as $function$
declare v_seller uuid:=public.zune_seller_owner_id(); v_campaign public.ad_campaigns; v_bid public.ad_auction_bids; v_floor numeric:=0;
begin
 if auth.uid() is null or v_seller is null then raise exception 'Seller session required' using errcode='42501'; end if;
 if p_bid_type not in ('cpc','cpm') or p_bid_amount_tzs is null or p_bid_amount_tzs<=0
    or p_daily_budget_tzs is null or p_daily_budget_tzs<=0 then raise exception 'Bid and daily budget must be greater than zero'; end if;
 select * into v_campaign from public.ad_campaigns where id=p_campaign_id and seller_id=v_seller for update;
 if not found then raise exception 'Campaign not found'; end if;
 if v_campaign.pricing_model not in ('auction','hybrid') then raise exception 'This campaign is not configured for auction bidding'; end if;
 if not exists(select 1 from public.ad_system_settings where singleton and auction_enabled) then raise exception 'Auction is currently disabled'; end if;
 if p_bid_type='cpc' then select coalesce(pkg.cpc_floor_tzs,0) into v_floor from public.ad_packages pkg where pkg.id=v_campaign.package_id;
 else select coalesce(pkg.cpm_floor_tzs,0) into v_floor from public.ad_packages pkg where pkg.id=v_campaign.package_id; end if;
 if p_bid_amount_tzs<v_floor then raise exception 'Bid is below the minimum price'; end if;
 insert into public.ad_auction_bids(campaign_id,seller_id,bid_type,bid_amount_tzs,daily_budget_tzs,seller_note)
 values(p_campaign_id,v_seller,p_bid_type,p_bid_amount_tzs,p_daily_budget_tzs,nullif(btrim(p_seller_note),'')) returning * into v_bid;
 return v_bid;
end;
$function$;

create or replace function private.zune_admin_review_ad_bid_impl(p_bid_id uuid,p_decision text,p_reason text)
returns public.ad_auction_bids language plpgsql security definer set search_path=''
as $function$
declare v_bid public.ad_auction_bids;
begin
 if auth.uid() is null or not public.zune_is_admin() then raise exception 'Admin Mkuu pekee ndiye anayeruhusiwa' using errcode='42501'; end if;
 if p_decision not in ('accepted','rejected','outbid') then raise exception 'Invalid decision'; end if;
 if coalesce(length(btrim(p_reason)),0)<5 then raise exception 'Review reason is required'; end if;
 select * into v_bid from public.ad_auction_bids where id=p_bid_id for update;
 if not found or v_bid.status<>'submitted' then raise exception 'Bid not found or already reviewed'; end if;
 update public.ad_auction_bids set status=p_decision,admin_reason=btrim(p_reason),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now()
 where id=p_bid_id returning * into v_bid;
 if p_decision='accepted' then
  update public.ad_campaigns set pricing_model=v_bid.bid_type,
   bid_cpc_tzs=case when v_bid.bid_type='cpc' then v_bid.bid_amount_tzs else bid_cpc_tzs end,
   bid_cpm_tzs=case when v_bid.bid_type='cpm' then v_bid.bid_amount_tzs else bid_cpm_tzs end,
   daily_budget_tzs=v_bid.daily_budget_tzs,updated_at=now() where id=v_bid.campaign_id;
 end if;
 insert into public.admin_activity_logs(actor_id,action,target_type,target_id,reason,details)
 values(auth.uid(),'ad_auction_bid_'||p_decision,'ad_auction_bid',v_bid.id::text,btrim(p_reason),
  jsonb_build_object('campaign_id',v_bid.campaign_id,'seller_id',v_bid.seller_id,'bid_type',v_bid.bid_type,'bid_amount_tzs',v_bid.bid_amount_tzs));
 return v_bid;
end;
$function$;

create or replace function private.zune_admin_update_ad_system_settings_impl(
 p_default_commission_rate numeric,p_max_ads_per_placement integer,p_attribution_window_days integer,
 p_auction_enabled boolean,p_cpc_enabled boolean,p_cpm_enabled boolean,p_checkout_ads_enabled boolean,p_reason text
) returns public.ad_system_settings
language plpgsql security definer set search_path=''
as $function$
declare v_settings public.ad_system_settings;
begin
 if auth.uid() is null or not public.zune_is_admin() then raise exception 'Admin Mkuu pekee ndiye anayeruhusiwa' using errcode='42501'; end if;
 if coalesce(length(btrim(p_reason)),0)<5 then raise exception 'Reason is required'; end if;
 if p_default_commission_rate not between 0 and 30 or p_max_ads_per_placement not between 1 and 20
   or p_attribution_window_days not between 1 and 30 then raise exception 'Invalid advertising settings'; end if;
 update public.ad_system_settings set default_commission_rate=p_default_commission_rate,
  max_ads_per_placement=p_max_ads_per_placement,attribution_window_days=p_attribution_window_days,
  auction_enabled=p_auction_enabled,cpc_enabled=p_cpc_enabled,cpm_enabled=p_cpm_enabled,
  checkout_ads_enabled=p_checkout_ads_enabled,updated_by=auth.uid(),updated_at=now()
 where singleton=true returning * into v_settings;
 insert into public.admin_activity_logs(actor_id,action,target_type,target_id,reason,details)
 values(auth.uid(),'ad_system_settings_updated','ad_system_settings','singleton',btrim(p_reason),
  jsonb_build_object('commission_rate',p_default_commission_rate,'max_ads_per_placement',p_max_ads_per_placement,
   'attribution_window_days',p_attribution_window_days,'auction_enabled',p_auction_enabled,
   'cpc_enabled',p_cpc_enabled,'cpm_enabled',p_cpm_enabled,'checkout_ads_enabled',p_checkout_ads_enabled));
 return v_settings;
end;
$function$;

revoke all on function private.zune_seller_place_ad_bid_impl(uuid,text,numeric,numeric,text) from public,anon;
revoke all on function private.zune_admin_review_ad_bid_impl(uuid,text,text) from public,anon;
revoke all on function private.zune_admin_update_ad_system_settings_impl(numeric,integer,integer,boolean,boolean,boolean,boolean,text) from public,anon;
grant execute on function private.zune_seller_place_ad_bid_impl(uuid,text,numeric,numeric,text) to authenticated;
grant execute on function private.zune_admin_review_ad_bid_impl(uuid,text,text) to authenticated;
grant execute on function private.zune_admin_update_ad_system_settings_impl(numeric,integer,integer,boolean,boolean,boolean,boolean,text) to authenticated;

create or replace function public.zune_seller_place_ad_bid(p_campaign_id uuid,p_bid_type text,p_bid_amount_tzs numeric,p_daily_budget_tzs numeric,p_seller_note text default null)
returns public.ad_auction_bids language sql security invoker set search_path=''
as $function$ select private.zune_seller_place_ad_bid_impl(p_campaign_id,p_bid_type,p_bid_amount_tzs,p_daily_budget_tzs,p_seller_note); $function$;
create or replace function public.zune_admin_review_ad_bid(p_bid_id uuid,p_decision text,p_reason text)
returns public.ad_auction_bids language sql security invoker set search_path=''
as $function$ select private.zune_admin_review_ad_bid_impl(p_bid_id,p_decision,p_reason); $function$;
create or replace function public.zune_admin_update_ad_system_settings(
 p_default_commission_rate numeric,p_max_ads_per_placement integer,p_attribution_window_days integer,
 p_auction_enabled boolean,p_cpc_enabled boolean,p_cpm_enabled boolean,p_checkout_ads_enabled boolean,p_reason text
) returns public.ad_system_settings language sql security invoker set search_path=''
as $function$ select private.zune_admin_update_ad_system_settings_impl(
 p_default_commission_rate,p_max_ads_per_placement,p_attribution_window_days,
 p_auction_enabled,p_cpc_enabled,p_cpm_enabled,p_checkout_ads_enabled,p_reason); $function$;

revoke all on function public.zune_seller_place_ad_bid(uuid,text,numeric,numeric,text) from public,anon;
revoke all on function public.zune_admin_review_ad_bid(uuid,text,text) from public,anon;
revoke all on function public.zune_admin_update_ad_system_settings(numeric,integer,integer,boolean,boolean,boolean,boolean,text) from public,anon;
grant execute on function public.zune_seller_place_ad_bid(uuid,text,numeric,numeric,text) to authenticated;
grant execute on function public.zune_admin_review_ad_bid(uuid,text,text) to authenticated;
grant execute on function public.zune_admin_update_ad_system_settings(numeric,integer,integer,boolean,boolean,boolean,boolean,text) to authenticated;
