# Source comparison

| Stable-ID behavior | Odoo source | Core3 result |
| --- | --- | --- |
| Separate action from Replenishment | stock.action_orderpoint vs stock.action_orderpoint_replenish | Separate reordering-rules page/API contracts; existing /replenishment remains unchanged |
| Automatic default | search_default_trigger: auto | List defaults to trigger: auto |
| List/kanban/form surface | view_mode: list,kanban,form | List, mobile kanban, and Odoo form detail |
| Rule identity | Product/location/company uniqueness | Guard rejects duplicate product/location/company, including archived rows |
| Quantity contract | product_min_qty <= product_max_qty | 422 INVENTORY_REORDERING_RULE_RANGE_INVALID |
| Lifecycle | active archive field | Archive/restore mutations with row-version guard |
| Company/security | _check_company_auto, stock user/manager access | Company-filtered reads; mutations require inventory.manage |
| Persistence | stock.warehouse.orderpoint | Existing durable inventory_orderpoints plus migration 0.0.90 index/fixture |

The Core3 navigation item is a deliberate route alias because the supplied
current Odoo XML does not bind this action to a menu item. This is not claimed
as exact menu-order parity.
