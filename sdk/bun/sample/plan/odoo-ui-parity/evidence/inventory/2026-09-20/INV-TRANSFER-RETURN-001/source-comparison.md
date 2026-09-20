# INV-TRANSFER-RETURN-001 source comparison

Date: 2026-09-20

## Odoo source

- `addons/stock/views/stock_picking_views.xml:129-143` exposes the completed
  picking `Return` action (`act_stock_return_picking`) and the Returns stat
  action.
- `addons/stock/wizard/stock_picking_return_views.xml` defines the modal
  return lines (`product`, `quantity`, `uom`, `move_id`) and the Return,
  Return All, Return for Exchange, and Discard actions.
- `addons/stock/wizard/stock_picking_return.py` reverses source/destination,
  creates a new picking with `return_id` and `Return of <name>` origin, then
  confirms/assigns the return.

## Bounded Core3 mapping

- `pages/transfer-detail.yaml` remains presentation-only and exposes Return
  only for a Done transfer.
- `api/transfer-detail.yaml` owns the `stock.picking.return` form, quantity and
  reason fields, company/actor/row-version guards, return history datasource,
  and timeline refresh.
- Migration `20260920300000-033-inventory-transfer-returns.yaml` persists a
  deterministic completed delivery, return audit row, reverse picking, and
  move line. This slice intentionally supports exactly one completed source
  move line and returns it in a new Waiting receipt; multi-line wizard
  selection and exchange semantics remain explicitly out of scope.

## Authenticated reference result

The supplied authenticated Odoo user reached `/odoo/deliveries/1` at desktop
1440x1000 and mobile 390x844. The delivery is rendered as Done/Available, but
the reachable action bar exposes Validate, Print, and Cancel only; no Return
button, return wizard, or Returns stat is available. A scan of
`/odoo/deliveries/1` through `/odoo/deliveries/10` found no reachable Return
action. No Odoo mutation was attempted. The paired captures and exact
blocker are recorded in `odoo-desktop-no-return.png`,
`odoo-mobile-no-return.png`, and `odoo.json`.
