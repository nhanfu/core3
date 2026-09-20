# INV-TRANSFER-LOCK-001 source comparison

Date: 2026-09-21

## Odoo source

- `addons/stock/views/stock_picking_views.xml:490-501` binds the form-only
  `action_toggle_is_locked` server action named `Lock/Unlock` to
  `stock.picking` and gates it with `stock.group_stock_manager`.
- `addons/stock/models/stock_picking.py:658-661` declares `is_locked`, and
  `action_toggle_is_locked` at lines 1529-1532 toggles it on the picking.
- The form uses the lock state to make done quantities and scheduling fields
  read-only (`stock_picking_views.xml:182,268-284`).

## Bounded Core3 mapping

- `pages/transfer-detail.yaml` remains presentation-only and exposes the
  manager-only Lock / Unlock action for non-cancelled transfers.
- `api/transfer-detail.yaml` owns `is_locked`, the
  `stock.picking.action_toggle_is_locked` mutation, company/actor/current-row
  guards, durable timeline event, and detail refresh.
- Migration `20260921090000-035-inventory-transfer-locks.yaml` adds durable
  lock state to every picking and defaults existing deterministic fixtures to
  locked. The action toggles the state with optimistic concurrency; broader
  field-level editability remains a follow-up.

## Authenticated reference result

The supplied authenticated Odoo user reached `/odoo/deliveries/1` and
`/odoo/deliveries/2` at desktop 1440x1000 and `/odoo/deliveries/1` at mobile
390x844. The reachable transfer forms expose Validate/Print/Cancel but not
Lock/Unlock, consistent with the source manager-group gate. No Odoo mutation
was attempted. Paired captures and the exact blocker are recorded in
`odoo.json`.
