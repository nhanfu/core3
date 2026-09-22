# INV-PRODUCT-STORAGE-CAPACITY-001

Bounded source-backed implementation of Odoo's product-form Storage Capacities action.

- Source: `addons/stock/models/product.py:635-645` and
  `addons/stock/views/product_views.xml:411-416,534-543`.
- Core3: product template and variant detail actions navigate to the separate
  `/storage-categories/capacity` page/API pair, filtered by product or all
  variants of a template.
- Durable data: reuses `inventory_storage_category_capacities`; no new
  migration was needed. Product and legacy stock-report identities are mapped
  deterministically, including the Core3 Demo Company/My Company alias.
- Mutation boundary: `inventory.manage` is required for create/update/delete;
  reads require `inventory.multi_location`.

Authenticated Odoo/Core3 visual evidence is blocked by the BrowserSkill tab
borrow confirmation timeout. See `browser-blocker.md`.
