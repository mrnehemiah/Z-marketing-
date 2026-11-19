-- Align campaign-payment vs usage-wallet billing and tighten ad event access.

create or replace function private.zune_ads_campaign_prepare()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare v_rate numeric:=0;
begin
 if old.status is distinct from 'approved' and new.status='approved' then
  select coalesce(nullif(pkg.commission_rate,0),s.default_commission_rate,0)
    into v_rate from public.ad_packages pkg
    cross join public.ad_system_settings s
    where pkg.id=new.package_id and s.singleton=true;
  new.commission_rate:=coalesce(v_rate,0);
  if new.billing_mode='campaign' or new.pricing_model='fixed' then
    new.commission_tzs:=round(new.budget_tzs*new.commission_rate/(100+new.commission_rate),2);
    new.spent_tzs:=new.budget_tzs;
  end if;
 end if;
 return new;
end;
$function$;

create or replace function private.zune_ads_campaign_settlement()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare v_release numeric:=0;
begin
 if old.status is distinct from 'approved' and new.status='approved'
    and (new.billing_mode='campaign' or new.pricing_model='fixed') then
  update public.ads_wallets set reserved_tzs=greatest(0,reserved_tzs-new.budget_tzs),updated_at=now()
    where seller_id=new.seller_id;
  if new.budget_tzs-new.commission_tzs>0 then
   insert into public.ads_wallet_transactions(seller_id,transaction_type,amount_tzs,status,campaign_id,reason)
   values(new.seller_id,'campaign_spend',new.budget_tzs-new.commission_tzs,'completed',new.id,'Flat Sponsored Ads campaign charge');
  end if;
  if new.commission_tzs>0 then
   insert into public.ads_wallet_transactions(seller_id,transaction_type,amount_tzs,status,campaign_id,reason)
   values(new.seller_id,'commission_charge',new.commission_tzs,'completed',new.id,'ZUNE Sponsored Ads commission');
  end if;
 end if;
 if old.status in ('approved','paused') and new.status in ('completed','expired') then
  v_release:=greatest(0,coalesce(new.budget_tzs,0)-coalesce(new.spent_tzs,0));
  if v_release>0 then
   update public.ads_wallets set reserved_tzs=greatest(0,reserved_tzs-v_release),
     available_tzs=available_tzs+v_release,updated_at=now() where seller_id=new.seller_id;
   insert into public.ads_wallet_transactions(seller_id,transaction_type,amount_tzs,status,campaign_id,reason)
   values(new.seller_id,'campaign_release',v_release,'completed',new.id,'Unused Sponsored Ads budget released');
  end if;
 end if;
 return new;
end;
$function$;

create or replace function private.zune_ads_event_billing()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare
 v_campaign public.ad_campaigns; v_wallet public.ads_wallets;
 v_base numeric:=0; v_commission numeric:=0; v_total numeric:=0; v_daily numeric:=0;
 v_recent bigint:=0; v_cap integer:=3;
begin
 if new.event_type not in ('impression','click') or new.event_key is null
    or length(coalesce(new.visitor_key,''))<16 then return new; end if;
 select * into v_campaign from public.ad_campaigns where id=new.campaign_id for update;
 if not found or v_campaign.status<>'approved'
   or (v_campaign.starts_at is not null and v_campaign.starts_at>now())
   or (v_campaign.ends_at is not null and v_campaign.ends_at<=now()) then return new; end if;
 if auth.uid() is not null and auth.uid()=v_campaign.seller_id then return new; end if;
 if v_campaign.billing_mode='campaign' or v_campaign.pricing_model='fixed' then return new; end if;
 v_cap:=coalesce(v_campaign.max_impressions_per_user_per_day,3);
 select count(*) into v_recent from public.ad_events e
 where e.campaign_id=new.campaign_id and e.visitor_key=new.visitor_key
   and e.event_type=new.event_type and e.id<>new.id and e.created_at>=date_trunc('day',now());
 if new.event_type='click' and v_recent>=1 then return new; end if;
 if new.event_type='impression' and v_recent>=v_cap then return new; end if;
 if v_campaign.pricing_model='cpc' and new.event_type='click' then v_base:=coalesce(v_campaign.bid_cpc_tzs,0);
 elsif v_campaign.pricing_model='cpm' and new.event_type='impression' then v_base:=coalesce(v_campaign.bid_cpm_tzs,0)/1000;
 elsif v_campaign.pricing_model='hybrid' then
   if new.event_type='click' then v_base:=coalesce(v_campaign.bid_cpc_tzs,0);
   else v_base:=coalesce(v_campaign.bid_cpm_tzs,0)/1000; end if;
 end if;
 if v_base<=0 then return new; end if;
 v_commission:=round(v_base*coalesce(v_campaign.commission_rate,0)/100,4);
 v_total:=round(v_base+v_commission,4);
 if v_campaign.spent_tzs+v_total>v_campaign.budget_tzs then return new; end if;
 if v_campaign.daily_budget_tzs is not null then
  select coalesce(sum(e.cost_tzs),0) into v_daily from public.ad_events e
  where e.campaign_id=new.campaign_id and e.is_billable=true and e.created_at>=date_trunc('day',now());
  if v_daily+v_total>v_campaign.daily_budget_tzs then return new; end if;
 end if;
 select * into v_wallet from public.ads_wallets where seller_id=v_campaign.seller_id for update;
 if not found or v_wallet.reserved_tzs<v_total then return new; end if;
 update public.ads_wallets set reserved_tzs=reserved_tzs-v_total,updated_at=now() where seller_id=v_campaign.seller_id;
 update public.ad_campaigns set spent_tzs=spent_tzs+v_total,commission_tzs=commission_tzs+v_commission,
   status=case when spent_tzs+v_total>=budget_tzs then 'completed' else status end,updated_at=now()
 where id=v_campaign.id;
 update public.ad_events set cost_tzs=v_total,is_billable=true,
   metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('base_cost_tzs',v_base,'commission_tzs',v_commission,'billing_model',v_campaign.pricing_model)
 where id=new.id;
 if v_base>0 then
  insert into public.ads_wallet_transactions(seller_id,transaction_type,amount_tzs,status,campaign_id,reason)
  values(v_campaign.seller_id,'campaign_spend',v_base,'completed',v_campaign.id,'Sponsored Ads billable event: '||new.event_type);
 end if;
 if v_commission>0 then
  insert into public.ads_wallet_transactions(seller_id,transaction_type,amount_tzs,status,campaign_id,reason)
  values(v_campaign.seller_id,'commission_charge',v_commission,'completed',v_campaign.id,'ZUNE Sponsored Ads commission');
 end if;
 return new;
end;
$function$;

drop policy if exists ad_events_public_insert on public.ad_events;
create policy ad_events_public_insert on public.ad_events
for insert to anon,authenticated with check (
 event_key is not null and length(coalesce(visitor_key,''))>=16
 and exists(select 1 from public.ad_campaigns c where c.id=ad_events.campaign_id
   and c.status='approved' and (c.starts_at is null or c.starts_at<=now())
   and (c.ends_at is null or c.ends_at>now()))
);
drop policy if exists ad_events_seller_read_own on public.ad_events;
create policy ad_events_seller_read_own on public.ad_events
for select to authenticated using (
 exists(select 1 from public.ad_campaigns c where c.id=ad_events.campaign_id
   and c.seller_id=public.zune_seller_owner_id())
);
