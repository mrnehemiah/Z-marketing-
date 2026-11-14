-- ZUNE Marketplace 2.0
-- Separate Customer Verified Account and Seller Verified Store requests.

alter table public.verified_badge_requests
  add column if not exists verification_type text not null default 'customer';

alter table public.verified_badge_requests
  drop constraint if exists verified_badge_requests_verification_type_check;

alter table public.verified_badge_requests
  add constraint verified_badge_requests_verification_type_check
  check (verification_type in ('customer', 'seller'));

create unique index if not exists verified_badge_requests_one_pending_per_type
  on public.verified_badge_requests (user_id, verification_type)
  where status = 'pending';

create or replace function public.zune_validate_badge_request_type()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_role text;
begin
  select role::text into v_role
  from public.profiles
  where id = new.user_id;

  if new.verification_type = 'customer' and v_role is distinct from 'buyer' then
    raise exception 'Customer verification requests are only available to customer accounts.';
  end if;

  if new.verification_type = 'seller' and v_role is distinct from 'vendor' then
    raise exception 'Seller verification requests are only available to seller accounts.';
  end if;

  return new;
end;
$$;

drop trigger if exists zune_validate_badge_request_type
  on public.verified_badge_requests;

create trigger zune_validate_badge_request_type
before insert on public.verified_badge_requests
for each row execute function public.zune_validate_badge_request_type();

comment on column public.verified_badge_requests.verification_type is
  'customer = Verified Account request; seller = Verified Store request.';
