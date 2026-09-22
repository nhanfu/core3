# Source comparison — `PURCHASE-CATALOG-001`

| Contract | Odoo 19 source | Core3 result | Status |
| --- | --- | --- | --- |
| Products-tab control | `button name="action_add_from_catalog" string="Catalog" type="object"` | Shared `LineItemGrid` action `add_purchase_order_catalog` | implemented |
| Purchase-only product domain | `_get_product_catalog_domain()` requires `purchase_ok` | Active `purchase_products` datasource filters `active` and `purchase_ok` | implemented |
| Vendor-aware catalog pricing | Odoo passes partner context and computes seller price | Bounded fixture uses durable `cost_price`; vendor-pricelist pricing remains outside this slice | partial, documented |
| Catalog selection UI | Odoo kanban catalog with per-product quantity controls | Shared multi-select modal with one quantity for selected products | partial, bounded |
| Add/merge persistence | Odoo updates existing order lines or adds lines | Transactional `for_each` update/insert with `product_id`, totals, and row version | implemented |
| Desktop/mobile authenticated comparison | Required live evidence | BrowserSkill borrow unavailable; no screenshots or visual claim | blocked |
