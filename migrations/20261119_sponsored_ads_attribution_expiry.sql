-- Attribute paid campaign clicks to product orders and release expired campaign holds.

alter table public.ad_events add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists ad_events_user_click_idx on public.ad_events(user_id,event_type,created_at desc) where user_id is not null;
create unique index if not exists ad_events_order_campaign_uidx on public.ad_events(order_id,campaign_id)
  where order_id is not null and event_type='attributed_order';

create or replace function private.zune_ads_order_attribution()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare v_click public.ad_events; v_window integer;
begin
 if new.buyer_id is null or new.product_id is null then return new; end if;
 select e.* into v_click
 from public.ad_events e
 join public.ad_campaigns c on c.id=e.campaign_id
 where e.user_id=new.buyer_id and e.event_type='click'
   and c.product_id=new.product_id
   and e.created_at>=now()-make_interval(days=>coalesce(c.attribution_window_days,7))
 order by e.created_at desc limit 1;
 if not found then return new; end if;
 select attribution_window_days into v_window from public.ad_campaigns where id=v_click.campaign_id;
 insert into public.ad_events(campaign_id,event_type,visitor_key,order_id,user_id,event_key,placement,metadata)
 values(v_click.campaign_id,'attributed_order',v_click.visitor_key,new.id,new.buyer_id,
  'order:'||new.id::text||':campaign:'||v_click.campaign_id::text,v_click.placement,
  jsonb_build_object('product_id',new.product_id,'order_value_tzs',new.total_price,
    'attribution_window_days',coalesce(v_window,7),'source_click_event_id',v_click.id))
 on conflict do nothing;
 return new;
end;
$function$;
revoke all on function private.zune_ads_order_attribution() from public,anon,authenticated;
drop trigger if exists zune_ads_order_attribution on public.orders;
create trigger zune_ads_order_attribution after insert on public.orders
for each row execute function private.zune_ads_order_attribution();

create or replace function private.zune_ads_expire_campaigns_impl()
returns integer language plpgsql security definer set search_path=''
as $function$
declare v_count integer;
begin
 update public.ad_campaigns set status='expired',updated_at=now()
 where status in ('approved','paused') and ends_at is not null and ends_at<=now();
 get diagnostics v_count=row_count;
 return v_count;
end;
$function$;
revoke all on function private.zune_ads_expire_campaigns_impl() from public,anon,authenticated;
create or replace function public.zune_admin_expire_ad_campaigns()
returns integer language plpgsql security invoker set search_path=''
as $function$
begin
 if auth.uid() is null or not public.zune_is_admin() then raise exception 'Admin Mkuu pekee ndiye anayeruhusiwa' using errcode='42501'; end if;
 return private.zune_ads_expire_campaigns_impl();
end;
$function$;
revoke all on function public.zune_admin_expire_ad_campaigns() from public,anon;
grant execute on function public.zune_admin_expire_ad_campaigns() to authenticated;
