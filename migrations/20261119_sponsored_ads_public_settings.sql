-- Public-safe Sponsored Ads delivery settings; only non-sensitive flags are returned.
create or replace function public.zune_ad_public_settings()
returns jsonb language sql stable security definer set search_path=''
as $function$
  select jsonb_build_object(
    'checkout_ads_enabled',coalesce((select s.checkout_ads_enabled from public.ad_system_settings s where s.singleton=true),false),
    'max_ads_per_placement',coalesce((select s.max_ads_per_placement from public.ad_system_settings s where s.singleton=true),3)
  );
$function$;
revoke all on function public.zune_ad_public_settings() from public;
grant execute on function public.zune_ad_public_settings() to anon,authenticated;