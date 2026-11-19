-- Do not approve CPC/CPM wallet campaigns until at least one bid has been approved.

create or replace function private.zune_ads_campaign_prepare()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare v_rate numeric:=0;
begin
 if old.status is distinct from 'approved' and new.status='approved' then
  if new.billing_mode='wallet' and new.pricing_model in ('auction','hybrid')
     and coalesce(new.bid_cpc_tzs,0)<=0 and coalesce(new.bid_cpm_tzs,0)<=0 then
    raise exception 'Auction campaign requires at least one Admin-approved CPC or CPM bid.';
  end if;
  select coalesce(nullif(pkg.commission_rate,0),s.default_commission_rate,0)
   into v_rate from public.ad_packages pkg cross join public.ad_system_settings s
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
