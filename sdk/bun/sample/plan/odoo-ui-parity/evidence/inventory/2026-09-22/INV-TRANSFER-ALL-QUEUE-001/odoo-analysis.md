# Odoo analysis

- Addon/source: local Odoo 19 `stock`, revision `65975996`.
- Operation-card source: `addons/stock/views/stock_picking_type_views.xml:199`
  binds `get_stock_picking_action_picking_type` to the card menu label `All`.
- Action source: `addons/stock/views/stock_picking_views.xml:563-567`
  defines `stock.stock_picking_action_picking_type` as `All Transfers` for
  `stock.picking` with the `partner_address` context.
- Server source: `addons/stock/models/stock_picking.py:463-470` maps incoming,
  outgoing, and internal cards to their specialized actions and falls back to
  `stock.stock_picking_action_picking_type`; `_get_action` applies the selected
  operation type domain at `stock_picking.py:420-440`.
- Resulting view contract: transfer rows are scoped to the selected operation
  type and company; the bounded Core3 collection provides list and responsive
  kanban cards, search, state/operation filters, row navigation, and refresh
  history.

The live authenticated reference tab was listed at
`http://localhost:8069/odoo/crm` in user scope. Borrowing tab `1770662590`
with bsk session `yuul` and the required confirmation did not return a result;
the session later expired as an unregistered resource. The live action could
not be inspected in this turn.
