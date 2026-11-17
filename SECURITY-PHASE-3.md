# ZUNE Marketplace — Security audit, Phase 3

## Scope

This phase reviews account-removal safety, the exposed `SECURITY DEFINER` RPC surface, and the three private-schema credential/rate-limit tables. It is designed for the existing Supabase Free project and does not require a plan upgrade.

## Change proposed

- Restrict `public.delete_my_account()` so browser/mobile roles `anon` and `authenticated` cannot execute it.
- Preserve execution for `service_role` only, for trusted server-side maintenance if needed.
- Mark the legacy hard-delete routine as deprecated for client use.
- Include assertions that fail if the resulting grants are not correct.

The function is unsafe for client-side account removal. It attempts to delete orders using a `user_id` column, while the live `orders` table uses `buyer_id`. It also deletes profiles and Auth users despite order, payment, dispute, store, product, and audit foreign-key dependencies. This change deliberately preserves all existing data.

## RPC review results

Read-only inspection of the live database found:

- 49 public `SECURITY DEFINER` functions executable by `authenticated`.
- 0 such functions executable by `anon`.
- All 49 have an explicit, pinned `search_path`.
- 42 reference `auth.uid()`; administrative operations reviewed use the `zune_is_admin()` or `zune_assert_admin()` guard.
- The dispute eligibility helpers compare supplied identities with order/product ownership and the authenticated user.
- `zune_wishlist_counts(uuid[])` has no per-user identity check, but returns aggregate counts grouped by product ID, not wishlist rows or user identities. It is left unchanged pending confirmation of its public product-metric use.
- Seller portal identity/password setup and rate-limit RPCs are not executable by `anon` or `authenticated`; their execution is restricted to the trusted backend role.

No blanket revoke was applied to the 49 functions: several are used by RLS policies or authenticated Marketplace/Seller workflows, and removing their grants without mapping every caller could break working features.

## Private schema review

These tables have RLS enabled and no direct table grants to `anon`, `authenticated`, or `PUBLIC`:

- `private.seller_portal_identities`
- `private.seller_portal_rate_limits`
- `private.store_credentials`

The advisor's “RLS enabled with no policy” notice for these tables is not evidence of direct client table access because client roles have no table privileges. These tables are accessed through scoped trusted functions. No permissive policies were added.

## Account-removal workflow

The Marketplace account and settings screens reviewed do not expose a self-service hard-delete control. A complete account-erasure workflow still needs a separately designed trusted backend process that:
1. verifies the account owner and any required re-authentication;
2. handles active orders, payments, disputes, seller stores, and legal/audit retention;
3. anonymizes eligible personal data without destroying financial/order history;
4. revokes Auth sessions and prevents future access;
5. records the request and its completion status.

That workflow is intentionally not implemented as a client-side SQL delete. The old RPC is disabled for client roles first.

## Supabase Free-plan limitation

Leaked-password protection is reported as disabled and is not available on the current Free plan. Marketplace-side password-strength validation was already merged in PR #38; it is a mitigation, not an equivalent replacement for the provider's compromised-password check.

## Deployment and verification

- This PR adds a reviewed SQL script; it does not execute it against the live database.
- Apply the SQL script only after reviewing it in the Supabase project.
- Run the post-apply privilege query included at the bottom of the SQL file.
- Re-run the Supabase Security Advisor.
- Phase 4 should perform live auth, RLS, account lifecycle, seller portal, and Marketplace regression tests. No browser/device tests are claimed by this phase.
