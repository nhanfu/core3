# Functionality checklist — `PURCHASE-CATALOG-001`

| Stable requirement | Result |
| --- | --- |
| Products-tab `Catalog` control | Implemented as shared `LineItemGrid` action |
| Page/API separation | `purchase-detail` page and API share `page.id`; page remains layout-only |
| Active, purchaseable catalog options | `purchase_order_catalog_products`, `purchase.read` |
| Multi-product selection and quantity | Shared `server_form` with `multi-select` and positive quantity |
| Existing product merge | Durable `product_id` matches an existing line and increments quantity |
| New product line | Uses stable order/product catalog identity and cost fixture |
| Totals and parent version | Recomputed atomically; parent `row_version` increments once |
| Editable-state guard | Draft/Sent, unlocked, expected parent version required |
| Empty/invalid/stale guards | Declared and focused-test covered |
| Permission boundary | `purchase.write` action; catalog read datasource uses `purchase.read` |
| Migration replay | Covered by the Purchase migration-backed focused suite |
| Authenticated Odoo/Core3 desktop/mobile evidence | Blocked by BrowserSkill tab borrow; no visual claim |
