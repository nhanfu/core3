# Odoo analysis

Reference: local Odoo 19 source under `/home/nhanjs/projects/odoo`.

- View: `addons/point_of_sale/views/pos_session_view.xml`
- Model: `addons/point_of_sale/models/pos_session.py`
- Source action: `pos.session.action_stock_picking()`
- Visible control: session form stat button labelled `Pickings`, icon
  `fa-truck`, showing `picking_count`, hidden when `picking_count == 0`.
- Action contract: `res_model=stock.picking`, ready-picking action, and domain
  `[('id', 'in', self.picking_ids.ids)]`.
- Permission context: the session form is available to POS users; this
  bounded Core3 read projection requires `pos.read` and applies current-
  company and selected-session scope.

Core3 already had a durable `pos_order_pickings` projection and an Inventory
transfer detail route, but the session detail exposed no Pickings stat action
or session-scoped list. This feature adds only that missing navigation/list
slice and reuses the existing projection.

Live inspection blocker: BrowserSkill instance `245ea108` was connected and
the authenticated Odoo tab `1770662590` was listed as `Acme Corporation`, but
`bsk tab borrow 1770662590 --session ppeq` returned `tab is borrowed by another
session` and identified owner session `ssyn`. The worker session was stopped;
the user tab remained untouched and no live Odoo desktop/mobile capture was
created.
