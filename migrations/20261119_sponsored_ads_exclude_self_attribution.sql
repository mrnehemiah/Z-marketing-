create or replace function private.zune_ads_capture_click()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare v_product uuid; v_window integer; v_seller uuid;
begin
 if new.event_type<>'click' or auth.uid() is null then return new; end if;
 select product_id,attribution_window_days,seller_id into v_product,v_window,v_seller
 from public.ad_campaigns where id=new.campaign_id;
 if v_product is null or v_seller=auth.uid() then return new; end if;
 insert into private.ad_click_attributions(campaign_id,product_id,buyer_id,visitor_key,placement,attribution_window_days)
 values(new.campaign_id,v_product,auth.uid(),coalesce(new.visitor_key,''),new.placement,coalesce(v_window,7));
 return new;
end;
$function$;