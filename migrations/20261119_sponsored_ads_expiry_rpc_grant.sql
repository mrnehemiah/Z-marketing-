-- Allow authenticated Admin callers to invoke the private expiry implementation through the protected public wrapper.
grant execute on function private.zune_ads_expire_campaigns_impl() to authenticated;
