# INV-PRODUCT-LOTS-001 — Product form Lot/Serial Numbers

Bounded feature: Odoo's `action_open_product_lot` stat action from Product and
Product Variant forms.

Core3 adds tracking-gated actions to both product detail forms and scopes the
existing Lots list by `product_template_id` or `product_id`. The API keeps the
page layout separate from datasource/action definitions, applies current
company scope, and exposes the durable `lot_count` stat. Migration 0.0.92 adds
two stable Large Cabinet lots in Stock and Shelf 2.

Functional/data/permission/restart evidence is recorded in the companion test
results and source comparison. Browser evidence is blocked; no desktop/mobile
visual-parity claim is made.
