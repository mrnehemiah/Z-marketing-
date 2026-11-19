-- Keep hybrid campaigns eligible to run both CPC and CPM after separate bid approvals.

create or replace function private.zune_admin_review_ad_bid_impl(p_bid_id uuid,p_decision text,p_reason text)
returns public.ad_auction_bids language plpgsql security definer set search_path=''
as $function$
declare v_bid public.ad_auction_bids; v_model text;
begin
 if auth.uid() is null or not public.zune_is_admin() then raise exception 'Admin Mkuu pekee ndiye anayeruhusiwa' using errcode='42501'; end if;
 if p_decision not in ('accepted','rejected','outbid') then raise exception 'Invalid decision'; end if;
 if coalesce(length(btrim(p_reason)),0)<5 then raise exception 'Review reason is required'; end if;
 select * into v_bid from public.ad_auction_bids where id=p_bid_id for update;
 if not found or v_bid.status<>'submitted' then raise exception 'Bid not found or already reviewed'; end if;
 select pricing_model into v_model from public.ad_campaigns where id=v_bid.campaign_id for update;
 update public.ad_auction_bids set status=p_decision,admin_reason=btrim(p_reason),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now()
 where id=p_bid_id returning * into v_bid;
 if p_decision='accepted' then
  update public.ad_campaigns set
   pricing_model=case when v_model='hybrid' then 'hybrid' else v_bid.bid_type end,
   bid_cpc_tzs=case when v_bid.bid_type='cpc' then v_bid.bid_amount_tzs else bid_cpc_tzs end,
   bid_cpm_tzs=case when v_bid.bid_type='cpm' then v_bid.bid_amount_tzs else bid_cpm_tzs end,
   daily_budget_tzs=greatest(coalesce(daily_budget_tzs,0),v_bid.daily_budget_tzs),updated_at=now()
  where id=v_bid.campaign_id;
 end if;
 insert into public.admin_activity_logs(actor_id,action,target_type,target_id,reason,details)
 values(auth.uid(),'ad_auction_bid_'||p_decision,'ad_auction_bid',v_bid.id::text,btrim(p_reason),
  jsonb_build_object('campaign_id',v_bid.campaign_id,'seller_id',v_bid.seller_id,'bid_type',v_bid.bid_type,'bid_amount_tzs',v_bid.bid_amount_tzs));
 return v_bid;
end;
$function$;
