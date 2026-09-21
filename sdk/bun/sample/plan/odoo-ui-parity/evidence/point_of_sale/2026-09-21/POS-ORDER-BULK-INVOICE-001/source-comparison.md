# Source comparison

## Odoo 19 reference

- `addons/point_of_sale/views/pos_order_view.xml:286-292` defines the Orders
  tree header action `action_create_invoices` with label `Create Invoices`.
- `addons/point_of_sale/models/pos_order.py:743-750` returns the
  `pos.make.invoice` transient wizard titled `Create Invoice(s)`.
- `addons/point_of_sale/wizard/pos_make_invoice.xml:4-15` renders the count,
  optional `consolidated_billing` field, and Create/Cancel controls.
- `addons/point_of_sale/wizard/pos_make_invoice.py:5-58` validates selected
  orders and creates grouped or separate invoices.

## Core3 implementation

- `services/point_of_sale/pages/pos-orders.yaml` declares `selectable: true`
  and `create_pos_invoices` while retaining the existing Orders surface.
- `services/point_of_sale/api/pos-orders.yaml` declares the matching
  `page.id: pos-orders` API action, `pos.write` permission, server form, and
  YAML mutation. A temporary selection table avoids array binder/UNNEST
  ambiguity while keeping the mutation transactional.
- `services/point_of_sale/migrations/20260921150000-048-pos-bulk-invoice.yaml`
  adds `pos_invoice_runs` and `pos_invoice_run_orders` for durable run state
  and selected-order/invoice links.

Intentional bounded differences: Core3 records the durable invoice run and
invoice rows but does not claim Odoo's accounting move model, tax/fiscal
position grouping, or no-customer confirmation wizard. Those remain follow-up
features rather than being silently implied by this slice.
