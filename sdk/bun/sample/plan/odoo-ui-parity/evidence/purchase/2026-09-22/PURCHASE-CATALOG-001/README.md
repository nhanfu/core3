# Purchase Catalog action — `PURCHASE-CATALOG-001`

Bounded feature: Odoo Purchase Order Products-tab `Catalog` control, backed by
`purchase.order.line.action_add_from_catalog` / `purchase.order.action_add_from_catalog`.

Core3 adds the shared LineItemGrid action, the matching
`purchase_order_catalog_products` datasource, and a transactional
`purchase.orders.catalog.add` server form. Migration
`20260922150000-032-purchase-order-catalog.yaml` adds durable `product_id`
identity to order lines. Selected active purchaseable products are added or
merged into existing catalog lines; order quantity, total, and row version are
refreshed together.

This is a bounded feature result, not a Purchase-module sign-off.

## Evidence boundary

The local Odoo source contract was inspected at:

- `addons/purchase/views/purchase_views.xml:240-255`
- `addons/purchase/models/purchase_order.py:1144-1168`
- `addons/purchase/models/purchase_order_line.py:531-533`

BrowserSkill instance `245ea108` was healthy. The first borrow of signed-in
Odoo tab `1770662590` was denied because it was already borrowed by session
`lexx`. After that holder disappeared, a fresh borrow request in session
`jqlz` remained pending until its 120-second timeout and returned no outcome.
The session was stopped. No Odoo tab was borrowed, no screenshot was captured,
and no desktop/mobile visual-parity claim is made for this feature.

No credentials, cookies, tokens, or screenshots are committed.
