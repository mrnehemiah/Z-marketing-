-- ZUNE Sponsored Ads v2 hybrid auction and controls
-- Applied to project rpkogiieegqgxqbzwxwo as migration zune_sponsored_ads_v2_hybrid_auction_settings.
-- This file is the repository copy of the additive migration. Existing Ads tables and data are preserved.
begin;
alter table public.ad_packages
  add column if not exists pricing_model text not null default 'fixed',
  add column if not exists commission_rate numeric(7,4) not null default 0,
  add column if not exists cpc_floor_tzs numeric(14,2) not null default 0,
  add column if not exists cpm_floor_tzs numeric(14,2) not null default 0,
  add column if not exists max_slots integer not null default 1,
  add column if not exists currency text not null default 'TZS';
alter table public.ad_campaigns
  add column if not exists pricing_model text not null default 'fixed',
  add column if not exists billing_mode text not null default 'wallet',
  add column if not exists bid_cpc_tzs numeric(14,2),
  add column if not exists bid_cpm_tzs numeric(14,2),
  add column if not exists daily_budget_tzs numeric(14,2),
  add column if not exists spent_tzs numeric(14,2) not null default 0,
  add column if not exists commission_rate numeric(7,4) not null default 0,
  add column if not exists commission_tzs numeric(14,2) not null default 0,
  add column if not exists audience jsonb not null default '{}'::jsonb,
  add column if not exists attribution_window_days integer not null default 7,
  add column if not exists max_impressions_per_user_per_day integer not null default 3;
alter table public.ad_events
  add column if not exists event_key text,
  add column if not exists placement text,
  add column if not exists cost_tzs numeric(14,4) not null default 0,
  add column if not exists is_billable boolean not null default false,
  add column if not exists metadata jsonb not null default '{}'::jsonb;
do $$
declare c record;
begin
  for c in select conname from pg_constraint
    where conrelid='public.ad_packages'::regclass and contype='c'
      and pg_get_constraintdef(oid) ilike '%duration_days%'
  loop execute format('alter table public.ad_packages drop constraint %I',c.conname); end loop;
  alter table public.ad_packages add constraint ad_packages_v2_values_check
    check (duration_days > 0 and commission_rate between 0 and 30
      and cpc_floor_tzs >= 0 and cpm_floor_tzs >= 0 and max_slots between 1 and 20
      and pricing_model in ('fixed','auction','hybrid','cpc','cpm') and currency='TZS');
end $$;
alter table public.ad_campaigns add constraint ad_campaigns_v2_pricing_check
  check (pricing_model in ('fixed','auction','hybrid','cpc','cpm')
    and billing_mode in ('wallet','campaign')
    and (bid_cpc_tzs is null or bid_cpc_tzs >= 0)
    and (bid_cpm_tzs is null or bid_cpm_tzs >= 0)
    and (daily_budget_tzs is null or daily_budget_tzs > 0)
    and spent_tzs >= 0 and commission_rate between 0 and 30 and commission_tzs >= 0
    and attribution_window_days between 1 and 30
    and max_impressions_per_user_per_day between 1 and 50);
create table if not exists public.ad_system_settings (
  singleton boolean primary key default true check (singleton),
  default_commission_rate numeric(7,4) not null default 0 check (default_commission_rate between 0 and 30),
  max_ads_per_placement integer not null default 3 check (max_ads_per_placement between 1 and 20),
  attribution_window_days integer not null default 7 check (attribution_window_days between 1 and 30),
  auction_enabled boolean not null default true,
  cpc_enabled boolean not null default true,
  cpm_enabled boolean not null default true,
  checkout_ads_enabled boolean not null default false,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
insert into public.ad_system_settings(singleton) values(true) on conflict(singleton) do nothing;
create table if not exists public.ad_auction_bids (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  bid_type text not null check (bid_type in ('cpc','cpm')),
  bid_amount_tzs numeric(14,2) not null check (bid_amount_tzs > 0),
  daily_budget_tzs numeric(14,2) not null check (daily_budget_tzs > 0),
  status text not null default 'submitted' check (status in ('submitted','accepted','rejected','withdrawn','outbid')),
  seller_note text, admin_reason text, reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ad_campaigns_delivery_idx on public.ad_campaigns(status,placement,starts_at,ends_at);
create index if not exists ad_campaigns_seller_created_idx on public.ad_campaigns(seller_id,created_at desc);
create index if not exists ad_events_campaign_type_created_idx on public.ad_events(campaign_id,event_type,created_at desc);
create unique index if not exists ad_events_event_key_uidx on public.ad_events(event_key) where event_key is not null;
create index if not exists ad_auction_bids_campaign_status_idx on public.ad_auction_bids(campaign_id,status,bid_amount_tzs desc);
create index if not exists ad_auction_bids_seller_created_idx on public.ad_auction_bids(seller_id,created_at desc);
alter table public.ad_system_settings enable row level security;
alter table public.ad_auction_bids enable row level security;
drop policy if exists ad_system_settings_admin_read on public.ad_system_settings;
create policy ad_system_settings_admin_read on public.ad_system_settings for select to authenticated using (public.zune_is_admin());
drop policy if exists ad_system_settings_admin_update on public.ad_system_settings;
create policy ad_system_settings_admin_update on public.ad_system_settings for update to authenticated using (public.zune_is_admin()) with check (public.zune_is_admin());
drop policy if exists ad_auction_bids_seller_read on public.ad_auction_bids;
create policy ad_auction_bids_seller_read on public.ad_auction_bids for select to authenticated using (seller_id=public.zune_seller_owner_id() or public.zune_is_admin());
drop policy if exists ad_auction_bids_seller_insert on public.ad_auction_bids;
create policy ad_auction_bids_seller_insert on public.ad_auction_bids for insert to authenticated with check (
  seller_id=public.zune_seller_owner_id() and status='submitted' and reviewed_by is null
  and exists (select 1 from public.ad_campaigns c where c.id=campaign_id
    and c.seller_id=public.zune_seller_owner_id() and c.pricing_model in ('auction','hybrid')
    and c.status in ('draft','pending_review','approved')));
drop policy if exists ad_auction_bids_admin_update on public.ad_auction_bids;
create policy ad_auction_bids_admin_update on public.ad_auction_bids for update to authenticated using (public.zune_is_admin()) with check (public.zune_is_admin());
create or replace function public.zune_seller_place_ad_bid(p_campaign_id uuid,p_bid_type text,p_bid_amount_tzs numeric,p_daily_budget_tzs numeric,p_seller_note text default null)
returns public.ad_auction_bids language plpgsql security definer set search_path=''
as $function$
declare v_seller uuid:=public.zune_seller_owner_id(); v_campaign public.ad_campaigns; v_bid public.ad_auction_bids; v_floor numeric:=0;
begin
 if auth.uid() is null or v_seller is null then raise exception 'Seller session required' using errcode='42501'; end if;
 if p_bid_type not in ('cpc','cpm') or p_bid_amount_tzs is null or p_bid_amount_tzs<=0 or p_daily_budget_tzs is null or p_daily_budget_tzs<=0 then raise exception 'Bid and daily budget must be greater than zero'; end if;
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
end; $function$;
create or replace function public.zune_admin_review_ad_bid(p_bid_id uuid,p_decision text,p_reason text)
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
end; $function$;
create or replace function public.zune_admin_update_ad_system_settings(
 p_default_commission_rate numeric,p_max_ads_per_placement integer,p_attribution_window_days integer,
 p_auction_enabled boolean,p_cpc_enabled boolean,p_cpm_enabled boolean,p_checkout_ads_enabled boolean,p_reason text)
returns public.ad_system_settings language plpgsql security definer set search_path=''
as $function$
declare v_settings public.ad_system_settings;
begin
 if auth.uid() is null or not public.zune_is_admin() then raise exception 'Admin Mkuu pekee ndiye anayeruhusiwa' using errcode='42501'; end if;
 if coalesce(length(btrim(p_reason)),0)<5 then raise exception 'Reason is required'; end if;
 if p_default_commission_rate not between 0 and 30 or p_max_ads_per_placement not between 1 and 20 or p_attribution_window_days not between 1 and 30 then raise exception 'Invalid advertising settings'; end if;
 update public.ad_system_settings set default_commission_rate=p_default_commission_rate,max_ads_per_placement=p_max_ads_per_placement,
 attribution_window_days=p_attribution_window_days,auction_enabled=p_auction_enabled,cpc_enabled=p_cpc_enabled,
 cpm_enabled=p_cpm_enabled,checkout_ads_enabled=p_checkout_ads_enabled,updated_by=auth.uid(),updated_at=now()
 where singleton=true returning * into v_settings;
 insert into public.admin_activity_logs(actor_id,action,target_type,target_id,reason,details)
 values(auth.uid(),'ad_system_settings_updated','ad_system_settings','singleton',btrim(p_reason),
 jsonb_build_object('commission_rate',p_default_commission_rate,'max_ads_per_placement',p_max_ads_per_placement,
 'attribution_window_days',p_attribution_window_days,'auction_enabled',p_auction_enabled,'cpc_enabled',p_cpc_enabled,
 'cpm_enabled',p_cpm_enabled,'checkout_ads_enabled',p_checkout_ads_enabled));
 return v_settings;
end; $function$;
revoke all on function public.zune_seller_place_ad_bid(uuid,text,numeric,numeric,text) from public,anon;
grant execute on function public.zune_seller_place_ad_bid(uuid,text,numeric,numeric,text) to authenticated;
revoke all on function public.zune_admin_review_ad_bid(uuid,text,text) from public,anon;
grant execute on function public.zune_admin_review_ad_bid(uuid,text,text) to authenticated;
revoke all on function public.zune_admin_update_ad_system_settings(numeric,integer,integer,boolean,boolean,boolean,boolean,text) from public,anon;
grant execute on function public.zune_admin_update_ad_system_settings(numeric,integer,integer,boolean,boolean,boolean,boolean,text) to authenticated;
commit;
