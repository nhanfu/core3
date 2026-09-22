# Source comparison

| Odoo source | Contract | Core3 mapping |
| --- | --- | --- |
| `addons/sale/models/sale_order.py:1360-1382` | `action_update_prices` calls `_recompute_prices`; product prices are recomputed, discounts reset, and a message is posted. | `services/order/api/sale-order-detail.yaml:update_sale_order_prices` updates product lines from the active named pricelist, resets discount, recalculates subtotal/tax/total, and writes `system_activity`. |
| `addons/sale/views/sale_order_views.xml:468-486` | `Update Prices` is a pricelist-side object button and is hidden for confirmed/cancelled orders. | `services/order/pages/sale-order-detail.yaml` exposes `Update Prices` for `Quotation`/`Sent` when an active pricelist is available. |
| Odoo sale order edit access | Editable quotations may recompute prices; confirmed/cancelled orders may not. | `orders.write`, branch scope, active pricelist, editable workflow state, actor, and row-version guards. |

Core3 uses the existing durable `order_lines`, `orders`, and
`system_activity` tables; no new credential, token, or source-specific
frontend code is introduced.
