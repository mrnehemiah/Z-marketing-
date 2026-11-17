-- ZUNE Marketplace — Phase 4 final security verification
-- Read-only assertions. Run against the Supabase project after security migrations.

DO $$
DECLARE
  v_rls_off integer;
  v_auth_truncate integer;
  v_anon_truncate integer;
  v_anon_definer integer;
  v_auth_delete_rpc boolean;
  v_anon_delete_rpc boolean;
  v_service_delete_rpc boolean;
  v_future_truncate integer;
BEGIN
  SELECT count(*) INTO v_rls_off
  FROM pg_class c
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity;

  SELECT count(*) INTO v_auth_truncate
  FROM pg_class c
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r'
    AND has_table_privilege('authenticated',c.oid,'TRUNCATE');

  SELECT count(*) INTO v_anon_truncate
  FROM pg_class c
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r'
    AND has_table_privilege('anon',c.oid,'TRUNCATE');

  SELECT count(*) INTO v_anon_definer
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.prosecdef
    AND has_function_privilege('anon',p.oid,'EXECUTE');

  SELECT has_function_privilege('authenticated','public.delete_my_account()','EXECUTE')
    INTO v_auth_delete_rpc;
  SELECT has_function_privilege('anon','public.delete_my_account()','EXECUTE')
    INTO v_anon_delete_rpc;
  SELECT has_function_privilege('service_role','public.delete_my_account()','EXECUTE')
    INTO v_service_delete_rpc;

  SELECT count(*) INTO v_future_truncate
  FROM pg_default_acl d
  CROSS JOIN LATERAL aclexplode(d.defaclacl) a
  WHERE d.defaclrole='postgres'::regrole
    AND d.defaclnamespace='public'::regnamespace
    AND d.defaclobjtype='r'
    AND a.grantee IN ('authenticated'::regrole,'anon'::regrole)
    AND a.privilege_type='TRUNCATE';

  IF v_rls_off <> 0 THEN
    RAISE EXCEPTION 'FAIL: % public tables have RLS disabled',v_rls_off;
  END IF;
  IF v_auth_truncate <> 0 OR v_anon_truncate <> 0 THEN
    RAISE EXCEPTION 'FAIL: client TRUNCATE grants remain (authenticated %, anon %)',
      v_auth_truncate,v_anon_truncate;
  END IF;
  IF v_anon_definer <> 0 THEN
    RAISE EXCEPTION 'FAIL: % SECURITY DEFINER functions are executable by anon',v_anon_definer;
  END IF;
  IF v_auth_delete_rpc OR v_anon_delete_rpc OR NOT v_service_delete_rpc THEN
    RAISE EXCEPTION 'FAIL: delete_my_account() grants do not match the expected restricted state';
  END IF;
  IF v_future_truncate <> 0 THEN
    RAISE EXCEPTION 'FAIL: postgres default privileges still grant client TRUNCATE';
  END IF;

  RAISE NOTICE 'PASS: all public tables have RLS enabled';
  RAISE NOTICE 'PASS: anon/authenticated have no TRUNCATE on public tables';
  RAISE NOTICE 'PASS: anon cannot execute public SECURITY DEFINER functions';
  RAISE NOTICE 'PASS: legacy account-delete RPC is restricted to service_role';
  RAISE NOTICE 'PASS: postgres default privileges do not reintroduce client TRUNCATE';
END;
$$;

-- Optional human-readable inventory:
SELECT
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity) AS public_tables_with_rls,
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.prosecdef
     AND has_function_privilege('authenticated',p.oid,'EXECUTE')) AS authenticated_security_definer_rpcs,
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.prosecdef
     AND has_function_privilege('anon',p.oid,'EXECUTE')) AS anon_security_definer_rpcs;
