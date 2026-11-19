create or replace function private.zune_ads_expire_campaigns_impl()
returns integer language plpgsql security definer set search_path=''
as $function$
declare v_count integer;
begin
 if auth.uid() is null or not public.zune_is_admin() then
  raise exception 'Admin Mkuu pekee ndiye anayeruhusiwa' using errcode='42501';
 end if;
 update public.ad_campaigns set status='expired',updated_at=now()
 where status in ('approved','paused') and ends_at is not null and ends_at<=now();
 get diagnostics v_count=row_count;
 return v_count;
end;
$function$;