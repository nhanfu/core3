# INV-TRANSFER-BACKORDER-001 source comparison

Date: 2026-09-20/21 transition

## Odoo source

- `addons/stock/models/stock_picking.py:1413-1492` returns the
  `stock.backorder.confirmation` wizard when validation processes less than
  demand and the picking type is configured to ask.
- `addons/stock/wizard/stock_backorder_confirmation_views.xml:8-42` defines
  the explanation, per-transfer `to_backorder` toggle, Create Backorder, No
  Backorder, and Discard controls.
- `addons/stock/wizard/stock_backorder_confirmation.py:40-74` processes the
  selected decision; `stock_picking.py:1568-1603` creates a linked backorder
  picking and moves remaining quantities into it.

## Bounded Core3 mapping

- `pages/transfer-detail.yaml` remains presentation-only and exposes Create
  Backorder only for a current partial Ready transfer.
- `api/transfer-detail.yaml` owns the `stock.backorder.confirmation.process`
  form, Create Backorder/No Backorder decision, company/actor/row-version
  guards, durable history datasource, reverse lifecycle data, and timeline
  refresh.
- Migration `20260920310000-034-inventory-transfer-backorders.yaml` adds the
  `backorder_of_id` relation, durable decision ledger, and deterministic
  partial transfer fixture. This slice intentionally supports exactly one
  partial completed move line; multi-transfer wizard selection remains open.

## Authenticated reference result

The supplied authenticated Odoo account reached `/odoo/deliveries/1` through
`/odoo/deliveries/3` at desktop 1440x1000 and `/odoo/deliveries/1` at mobile
390x844. The reachable deliveries expose Validate/Print/Cancel or Mark as
Todo/Validate/Cancel, but no partial-validation backorder wizard. The
`/odoo/backorders` route redirects to Discuss and does not expose a backorder
list. No Odoo mutation was attempted. Paired captures and the exact blocker
are recorded in `odoo.json`.
