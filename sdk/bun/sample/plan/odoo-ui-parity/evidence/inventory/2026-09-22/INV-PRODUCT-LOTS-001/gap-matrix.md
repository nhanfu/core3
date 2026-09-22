# Gap matrix

| Odoo action | Core3 before | Required change | Result |
| --- | --- | --- | --- |
| `product.product.action_open_product_lot` | Variant form had no lot stat; `/lots` had no product filter. | Add a tracking-gated navigate action with variant context and apply product/company predicates. | Implemented |
| `product.template.action_open_product_lot` | Product form had no lot stat; no variant aggregation. | Add template context, aggregate all matching variants, and expose durable count. | Implemented |
| Lot action list/kanban/form and filters | Existing Lots surface already covered the shared action layout. | Reuse it; do not create a duplicate renderer. | Reused |
| Authenticated Odoo/Core3 visual comparison | No owned signed-in tab was available for this worker. | Borrow shared tab and capture both viewports. | Blocked by tab ownership; no claim made |
