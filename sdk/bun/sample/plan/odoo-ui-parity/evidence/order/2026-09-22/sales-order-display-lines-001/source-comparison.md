# Sales order display lines — source comparison

## Odoo 19 reference

- `addons/sale/views/sale_order_views.xml:606-615` declares the Sales Order
  Lines controls `Add a product`, `Add a section`, `Add a note`, and `Catalog`.
- `addons/sale/views/sale_order_views.xml:762-771` repeats the product/section/
  note controls in the mobile kanban surface.
- `addons/sale/models/sale_order_line.py:20-27` constrains display rows to
  non-accountable values; `:63-69` defines `line_section` and `line_note`.
- `addons/sale/models/sale_order_line.py:518-522` computes display-row quantity
  as zero. The live authenticated New quotation form showed the inline
  `Enter a description` field, zero amount, and overflow action.

## Core3 mapping

| Odoo contract | Core3 path | Result |
| --- | --- | --- |
| `Add a section` / `Add a note` controls | `services/order/pages/sale-order-detail.yaml` | implemented |
| Durable line type | `services/order/migrations/20260922100000-022-sales-order-display-lines.yaml`; `order_lines.display_type` | implemented |
| Read projection | `services/order/api/sale-order-detail.yaml`, `sale_order_lines` | implemented |
| Guarded create/edit/delete actions | `services/order/api/sale-order-detail.yaml` | implemented |
| Page/API separation | matching `sale-order-detail` page IDs | implemented |
| Browser parity | Core3 runtime | blocked; no 3001/3002 listener |
