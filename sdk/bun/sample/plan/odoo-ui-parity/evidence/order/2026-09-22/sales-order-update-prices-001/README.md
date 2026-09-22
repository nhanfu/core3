# Sales order Update Prices

Stable ID: `SALES-ORDER-UPDATE-PRICES-001`

This bounded slice maps Odoo `sale.order.action_update_prices` to the existing
YAML-first `sale-order-detail` page/API pair. It is limited to editable
quotation price recomputation and does not add a new order state.

- Source contract: `source-comparison.md`
- Verification contract: `verification.md`

Screenshots remain outside Git. No visual-parity claim is made without the
authenticated browser check.
