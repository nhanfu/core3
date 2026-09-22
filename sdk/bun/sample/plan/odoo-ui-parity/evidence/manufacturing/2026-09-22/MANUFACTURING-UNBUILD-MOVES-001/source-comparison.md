# Source comparison

- Odoo addon: `mrp`, local Odoo 19 source under `/home/nhanjs/projects/odoo`.
- Source action: `action_mrp_unbuild_moves` in
  `addons/mrp/views/mrp_unbuild_views.xml`.
- Model: `stock.move.line`.
- Modes: `list,form`.
- Domain: `move_id.unbuild_id = active_id OR move_id.consume_unbuild_id = active_id`.
- Visibility: the Unbuild Order form button is hidden unless `state == done`.

Core3 implements the action at `/unbuild-orders/detail/product-moves`, with a
separate page/API detail route, a Done-only stat button, `manufacturing.read`,
company-scoped durable joins, and no create/delete/workflow transitions.
