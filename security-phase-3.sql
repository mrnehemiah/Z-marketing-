-- ZUNE Marketplace security audit — Phase 3
-- Applied to the live Supabase project as migration 20261117093835.
-- This root-level SQL file is the review/audit copy of that applied change.
-- No customer, seller, order, payment, dispute, product, store, or audit data is deleted.

BEGIN;

-- The legacy function performs unsafe hard deletes. It references orders.user_id,
-- while the live orders table uses buyer_id, and its profile/Auth deletes have
-- commercial and audit foreign-key dependencies. Block browser/mobile execution.
REVOKE EXECUTE ON FUNCTION public.delete_my_account() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_my_account() FROM anon, authenticated;

-- Keep the existing trusted backend capability only. Never expose service_role
-- credentials in Marketplace, Seller Dashboard, or any public client.
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO service_role;

COMMENT ON FUNCTION public.delete_my_account() IS
  'DEPRECATED for client use. Hard deletion can damage commercial/audit history. '
  'EXECUTE is restricted to service_role pending a compliant account-removal workflow.';

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.delete_my_account()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Security check failed: anon can execute delete_my_account()';
  END IF;
  IF has_function_privilege('authenticated', 'public.delete_my_account()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Security check failed: authenticated can execute delete_my_account()';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.delete_my_account()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Security check failed: service_role lost delete_my_account() access';
  END IF;
END;
$$;

COMMIT;

-- Post-apply verification:
-- SELECT
--   has_function_privilege('anon', 'public.delete_my_account()', 'EXECUTE') AS anon_can_execute,
--   has_function_privilege('authenticated', 'public.delete_my_account()', 'EXECUTE') AS authenticated_can_execute,
--   has_function_privilege('service_role', 'public.delete_my_account()', 'EXECUTE') AS service_role_can_execute;
