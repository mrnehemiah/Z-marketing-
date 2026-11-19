-- Reserve campaign budget from Ads Wallet on Admin approval; charge flat campaigns and release unused auction funds.

create or replace function private.zune_ads_campaign_prepare()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare
 v_rate numeric:=0;
 v_available numeric:=0;
 v_is_flat boolean;
begin
 if old.status is distinct from 'approved' and new.status='approved' then
  if new.billing_mode='wallet' and new.pricing_model in ('auction','hybrid')
     and coalesce(new.bid_cpc_tzs,0)<=0 and coalesce(new.bid_cpm_tzs,0)<=0 then
    raise exception 'Auction campaign requires at least one Admin-approved CPC or CPM bid.';
  end if;
  if new.pricing_model='auction' and new.bid_cpc_tzs is null and new.bid_cpm_tzs is null then
    raise exception 'Auction campaign requires an approved bid.';
  end if;
  if new.pricing_model in ('cpc','hybrid') and not exists(select 1 from public.ad_system_settings where singleton and cpc_enabled) then
    raise exception 'CPC billing is currently disabled by Admin.';
  end if;
  if new.pricing_model in ('cpm','hybrid') and not exists(select 1 from public.ad_system_settings where singleton and cpm_enabled) then
    raise exception 'CPM billing is currently disabled by Admin.';
  end if;
  if new.pricing_model in ('auction','hybrid') and not exists(select 1 from public.ad_system_settings where singleton and auction_enabled) then
    raise exception 'Ad auction is currently disabled by Admin.';
  end if;

  select coalesce(nullif(pkg.commission_rate,0),s.default_commission_rate,0)
   into v_rate from public.ad_packages pkg cross join public.ad_system_settings s
   where pkg.id=new.package_id and s.singleton=true;
  new.commission_rate:=coalesce(v_rate,0);
  v_is_flat := new.billing_mode='campaign' or new.pricing_model='fixed';

  select available_tzs into v_available
   from public.ads_wallets where seller_id=new.seller_id for update;
  if not found then raise exception 'Ads Wallet haijapatikana. Tafadhali ongeza salio kwanza.'; end if;
  if v_available < new.budget_tzs then
   raise exception 'Ads Wallet balance is insufficient. Required: %, available: % TZS',new.budget_tzs,v_available;
  end if;
  update public.ads_wallets set available_tzs=available_tzs-new.budget_tzs,
    reserved_tzs=reserved_tzs+new.budget_tzs,updated_at=now()
   where seller_id=new.seller_id;

  if v_is_flat then
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
declare
 v_release numeric:=0;
 v_is_flat boolean;
begin
 if old.status is distinct from 'approved' and new.status='approved' then
  v_is_flat := new.billing_mode='campaign' or new.pricing_model='fixed';
  if v_is_flat then
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
 end if;

 if old.status in ('approved','paused') and new.status in ('completed','expired') then
  v_release:=greatest(0,coalesce(new.budget_tzs,0)-coalesce(new.spent_tzs,0));
  if v_release>0 then
   update public.ads_wallets set reserved_tzs=greatest(0,reserved_tzs-v_release),
     available_tzs=available_tzs+v_release,updated_at=now()
    where seller_id=new.seller_id;
   insert into public.ads_wallet_transactions(seller_id,transaction_type,amount_tzs,status,campaign_id,reason)
   values(new.seller_id,'campaign_release',v_release,'completed',new.id,'Unused Sponsored Ads budget released');
  end if;
 end if;
 return new;
end;
$function$;

alter table private.ad_click_attributions enable row level security;
revoke all on table private.ad_click_attributions from public,anon,authenticated;
