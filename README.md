# ZUNE Marketplace 2.0

ZUNE Marketplace is the customer and seller-facing marketplace application. The Admin dashboard remains a separate application/repository.

## Live applications

- Marketplace: https://mrnehemiah.github.io/Z-marketing-/
- ZUNE PREMIUM ADMIN: https://mrnehemiah.github.io/admin/

## Architecture

- Customer and Seller templates are independent and preserve account/store/product/order data when changed.
- Marketplace home includes Smart Search, admin-managed categories and promotions, product discovery feeds, verified badges, saved products and cart.
- Seller storefronts are public and use Seller-selected storefront templates independently from the Customer interface.
- Seller Center includes product and inventory tools, orders, delivery visibility, customers, messages, notifications, support, wallet and withdrawal requests, service locations, marketing, reviews and preferences.
- Supabase RLS and server-side RPCs enforce access to sensitive operations.

## Checkout and reviews

The following SQL migrations are kept in the repository root and have been applied to the connected Supabase project:

- `checkout.sql`: atomic checkout quote/order creation, idempotency, delivery pricing, Admin-managed coupon redemption, stock reservation and stock restoration when Admin cancels an order. It also synchronizes checkout status from order lifecycle updates.
- `product_reviews.sql`: verified-purchase reviews, Admin moderation fields and row-level security.

Checkout currently records Cash on Delivery as pending; online payment collection and reconciliation remain a later integration phase.

## Admin workflows

The separate Admin repository includes:
- Order status lifecycle: Pending → Confirmed → Completed, or Cancelled.
- Delivery status synchronization and order cancellation stock restoration.
- Product Reviews moderation, audit history, and buyer/Seller notifications.
- Existing seller, product, verification, coupon, Ads, delivery pricing and wallet management.

## Current build

The active continuation branch is `build/marketplace-2-foundation`.

- Previous foundation PR: https://github.com/mrnehemiah/Z-marketing-/pull/21 (merged).
- Current staged PR: https://github.com/mrnehemiah/Z-marketing-/pull/22 (draft; not merged).

JavaScript syntax checks and database schema/RLS checks have been performed. Browser/mobile visual QA and full end-to-end order testing remain to be completed before declaring the build production-ready.
