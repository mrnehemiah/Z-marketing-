# ZUNE Marketplace — Security Phase 4: final verification

## Live changes and verification

Phase 4 followed the merged Phase 3 PR #39 and used the existing Supabase Free project. No plan upgrade was required.

### Applied database migration

Migration `20261117094426` — `security_phase_4_revoke_client_truncate` — was applied successfully.

It:
- revokes `TRUNCATE` from `authenticated` and `anon` on all existing tables in `public`;
- removes the same `TRUNCATE` grant from future public tables created by the `postgres` migration role;
- leaves ordinary row-level permissions, including application `INSERT`, `SELECT`, `UPDATE`, and `DELETE`, unchanged;
- verifies the client roles have no effective `TRUNCATE` privileges before committing.

### Live verification results

| Check | Result |
|---|---:|
| Public tables with RLS | 77 / 77 |
| Public tables without RLS | 0 |
| Public tables where authenticated can TRUNCATE | 0 |
| Public tables where anon can TRUNCATE | 0 |
| SECURITY DEFINER RPCs executable by anon | 0 |
| Legacy account-delete RPC executable by authenticated | No |
| Legacy account-delete RPC executable by anon | No |
| Legacy account-delete RPC executable by service_role | Yes |
| Postgres default ACLs that re-grant TRUNCATE to client roles | 0 |

The prior audit found 65 public tables where authenticated had effective TRUNCATE permission. This is now zero. This was an important issue because RLS does not protect TRUNCATE operations.

### RLS review

The main customer and seller data paths reviewed include:
- Profiles: own-profile read/update policies; sensitive role and verification columns remain separately restricted.
- Orders: buyer reads their orders, sellers read/update orders connected to their own products, admins use the admin guard.
- Payments: buyer reads own payments; admins use the admin check.
- Products: public reads approved products; seller writes are scoped to their own vendor identity.
- Seller applications: users submit/read their own applications; admin review is guarded.
- Stores: sellers manage their own store; admin management is guarded.
- Cart, wishlist and delivery addresses: user-scoped policies.

All 77 public tables have RLS enabled. The read-only public policies on geography tables are intentional.

### Automated checks

GitHub Actions workflow `ZUNE source validation` passed on the Phase 3 PR head before merge. Its checks include JavaScript source validation and local asset references. The Phase 4 SQL verification script is included in this PR as a repeatable database assertion.

### Known remaining limitation

Supabase Free does not expose leaked-password protection. The Marketplace enforces a stronger client-side password policy, but that is not equivalent to provider-side breached-password screening.

The Supabase Security Advisor continues to flag authenticated `SECURITY DEFINER` functions. These are not all vulnerabilities: they include authenticated user operations and admin RPCs with authorization guards. They were not blanket-revoked because that could break RLS policies and Marketplace/Seller workflows. The aggregate-only `zune_wishlist_counts(uuid[])` RPC remains a documented review item.

## What was not simulated

No test buyer/seller/admin credentials were used, and no live browser/device journey was run. Therefore this report does not claim successful real-user login, checkout, seller portal, or admin UI regression tests. Those require controlled test accounts and explicit end-to-end execution.

## Data preservation

No customer, seller, product, store, cart, order, payment, dispute, wallet, verification, or audit data was deleted or rewritten by Phase 4.
