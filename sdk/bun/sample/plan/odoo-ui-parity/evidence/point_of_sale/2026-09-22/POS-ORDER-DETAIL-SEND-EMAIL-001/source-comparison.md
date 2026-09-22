# Source comparison

| Odoo 19 behavior | Core3 before this slice | Bounded change |
| --- | --- | --- |
| Order form shows the `email` envelope beside customer email when `email` is present | Core3 detail projected no customer email and had no detail email action; only the Orders list had Send Email | Project and display `customer_email`, then add a guarded `Send Email` header action |
| `action_send_mail()` opens the POS order mail composer | Core3 had the durable queue mutation only on `pos-orders` | Add a separate `send_pos_order_detail_email` server form in `api/pos-order-detail.yaml` with detail-state prefill |
| Odoo action uses the POS order mail template and selected order | Core3 list action already persisted recipient/content and operation audit | Reuse the same service-owned queue table and `pos.write` guards without a new schema or duplicate queue |

Intentional bounded difference: this slice does not add Odoo’s mail composer
template picker or a real outbound mail provider. It preserves Core3’s
durable queued-delivery boundary and existing shared form renderer.
