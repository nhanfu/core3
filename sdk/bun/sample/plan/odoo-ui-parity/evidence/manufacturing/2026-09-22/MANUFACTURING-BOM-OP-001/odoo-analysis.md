# Odoo analysis

- Addon: local Odoo 19 Community `mrp`, source checkout
  `/home/nhanjs/projects/odoo`.
- `addons/mrp/views/mrp_bom_views.xml` renders the BoM form stat button
  `Operations / Performance` and invokes `action_mrp_routing_time`.
- `addons/mrp/views/mrp_workorder_views.xml` defines
  `mrp.action_mrp_routing_time` for `mrp.workorder` with
  `graph,pivot,list,form,calendar`, default Done filtering, and the domain
  `operation_id.bom_id = active_id` plus `state = done`.
- The shared authenticated browser session at
  `http://localhost:8069/odoo/boms` redirected to Discuss/OdooBot on desktop
  and mobile. The Manufacturing launcher/menu was absent, so no live Odoo
  screen or populated report comparison was available.
