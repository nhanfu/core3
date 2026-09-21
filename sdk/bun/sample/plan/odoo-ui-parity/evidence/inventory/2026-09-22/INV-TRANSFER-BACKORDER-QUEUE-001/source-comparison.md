# INV-TRANSFER-BACKORDER-QUEUE-001 source comparison

Date: 2026-09-22

## Odoo 19 source

- Addon: `/home/nhanjs/projects/odoo/addons/stock`
- Action: `stock.action_picking_tree_backorder`
- Source: `addons/stock/views/stock_picking_views.xml:601-607`
- Title: `Backorders`
- View modes: `list,kanban,form,calendar`
- Context: `search_default_backorder: 1`
- Shared filter: `backorder_id != False` and state in `assigned`, `waiting`,
  or `confirmed` (`stock_picking_views.xml:385`)
- Model action method: `get_action_picking_tree_backorder` in
  `addons/stock/models/stock_picking.py:447-448`

Core3 implements the queue as a read-only, company-scoped datasource with a
durable refresh ledger. `pages/transfer-backorder-queue.yaml` owns layout and
`api/transfer-backorder-queue.yaml` owns queries/actions; both use
`page.id: transfer-backorder-queue`. The existing partial-validation Backorder
wizard remains separate and is not duplicated by this queue.

## Live reference result

The authenticated Inventory module loaded at `http://localhost:8069` using the
`core3_reference` database. Desktop and emulated 390x844 Overview captures are
retained in this feature folder. The direct `/odoo/backorders` path resolved to
Discuss on both observed viewports, and the current Overview showed no visible
Backorders card link. Therefore the source action is confirmed, but an
authenticated Backorders list/mutation capture is blocked and no Odoo visual
parity sign-off is claimed.
