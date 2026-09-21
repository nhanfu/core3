# Source comparison

| Odoo 19 behavior | Current Core3 before this slice | Bounded change |
| --- | --- | --- |
| `refund_orders_count` shows `Refunds` smart button | Detail query had a count projection but page exposed no action | Add `Refunds` header action and read-only navigation |
| `refunded_order_id` shows `Refunded Orders` on a refund | `original_order_id` and `original_order_name` were projected but not actionable | Add reverse navigation to the original order |
| `action_view_refund_orders()` opens filtered `Refund Orders` list/form | No related-refund page/API pair | Add `pos-order-refund-orders` page/API pair with `:order_id` and company scope |
| `action_view_refunded_order()` opens original `pos.order` form | No reverse action | Navigate to existing `pos-order-detail` |
| Relationship is durable through POS order/refund lines | `original_order_id`/`is_refund` and Return Products mutation already persist the relation | Add idempotent linked refund fixture and restart assertions |

Intentional bounded differences: Core3 uses the existing YAML list/detail
renderer and a service-owned filtered route instead of Odoo's dynamic window
action; it does not add accounting, stock, or partial-refund behavior.
