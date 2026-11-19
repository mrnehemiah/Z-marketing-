-- Keep buyer identifiers in private attribution storage, not the public ad_events table.

create table if not exists private.ad_click_attributions (
 id uuid primary key default gen_random_uuid(),
 campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
 product_id uuid not null references public.products(id) on delete cascade,
 buyer_id uuid not null references auth.users(id) on delete cascade,
 visitor_key text not null,
 placement text,
 attribution_window_days integer not null default 7,
 created_at timestamptz not null default now()
);
create index if not exists private_ad_click_attributions_lookup_idx
 on private.ad_click_attributions(buyer_id,product_id,created_at desc);

create or replace function private.zune_ads_capture_click()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare v_product uuid; v_window integer;
begin
 if new.event_type<>'click' or auth.uid() is null then return new; end if;
 select product_id,attribution_window_days into v_product,v_window
 from public.ad_campaigns where id=new.campaign_id;
 if v_product is null then return new; end if;
 insert into private.ad_click_attributions(campaign_id,product_id,buyer_id,visitor_key,placement,attribution_window_days)
 values(new.campaign_id,v_product,auth.uid(),coalesce(new.visitor_key,''),new.placement,coalesce(v_window,7));
 return new;
end;
$function$;
revoke all on function private.zune_ads_capture_click() from public,anon,authenticated;
drop trigger if exists zune_ads_capture_click on public.ad_events;
create trigger zune_ads_capture_click after insert on public.ad_events
for each row execute function private.zune_ads_capture_click();

create or replace function private.zune_ads_order_attribution()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare v_click private.ad_click_attributions;
begin
 if new.buyer_id is null or new.product_id is null then return new; end if;
 select * into v_click from private.ad_click_attributions a
 where a.buyer_id=new.buyer_id and a.product_id=new.product_id
   and a.created_at>=now()-make_interval(days=>coalesce(a.attribution_window_days,7))
 order by a.created_at desc limit 1;
 if not found then return new; end if;
 insert into public.ad_events(campaign_id,event_type,visitor_key,order_id,event_key,placement,metadata)
 values(v_click.campaign_id,'attributed_order',v_click.visitor_key,new.id,
  'order:'||new.id::text||':campaign:'||v_click.campaign_id::text,v_click.placement,
  jsonb_build_object('product_id',new.product_id,'order_value_tzs',new.total_price,
   'attribution_window_days',v_click.attribution_window_days))
 on conflict do nothing;
 return new;
end;
$function$;
revoke all on function private.zune_ads_order_attribution() from public,anon,authenticated;
drop trigger if exists zune_ads_order_attribution on public.orders;
create trigger zune_ads_order_attribution after insert on public.orders
for each row execute function private.zune_ads_order_attribution();

alter table public.ad_events drop column if exists user_id;
