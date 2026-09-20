# INV-TRANSFER-CHECK-AVAILABILITY-001 source comparison

## Odoo source

- `addons/stock/views/stock_picking_views.xml:117-120` exposes the transfer
  header `action_assign` button as `Check Availability` when the picking's
  `show_check_availability` context is true. The same form exposes Validate,
  Print, Return, and Cancel around the statusbar.
- `addons/stock/models/stock_picking.py:1196-1210` implements
  `stock.picking.action_assign`: draft pickings are confirmed, eligible moves
  are ordered, and `_action_assign()` reserves available stock. The paired
  `do_unreserve` source releases those reservations.
- `addons/stock/models/stock_move.py:2041-2050` defines the source reservation
  contract: a move is assigned when reserved quantity reaches demand and is
  partially available when it does not.

The supplied authenticated Odoo user reached `/odoo/deliveries/2` at desktop
and mobile widths. That source transfer was already `Ready` with Product
Availability `Available`, so Odoo correctly did not render `Check
Availability`; the action could not be executed on the reachable record. Both
captures had no failed requests, page errors, or horizontal overflow. No Odoo
mutation was performed. This is the exact comparison blocker.

## Core3 implementation

- `pages/transfer-detail.yaml` remains layout-only and adds the Reserved move
  quantity column and actor timeline labels. `api/transfer-detail.yaml` owns
  the separate action contract and reservation-aware line/detail queries.
- Migration `20260920290000-032-inventory-transfer-reservations.yaml` adds a
  durable reservation ledger and deterministic waiting delivery fixture tied
  to `quant-box-main` in `Core3 Demo Company`.
- `check_inventory_transfer_availability` now enforces inventory.write,
  company scope, current row version, move lines, available stock, and
  duplicate-reservation guards; it records the actor, increments the quant and
  picking revisions, and moves the transfer to Ready. Unreserve reverses the
  quant reservation and deletes the reservation rows before returning the
  transfer to Waiting.

Authenticated Core3 captures are `core3-desktop-before.png`,
`core3-desktop-complete.png`, and `core3-mobile-complete.png` with facts in
`core3.json`. The desktop action visibly changes the line to Reserved 4 and
Available; the mobile authenticated detail retains the same persisted state.
