# Odoo analysis

- Addon: local Odoo 19 Community `mrp`, source checkout
  `/home/nhanjs/projects/odoo`.
- Source action: `addons/mrp/views/mrp_workorder_views.xml` defines
  `action_mrp_workorder_production_specific` for `mrp.workorder` with
  `list,form,calendar,pivot,graph` and domain
  `[('production_id', '=', active_id)]`.
- The current Core3 MO page had an inline Work Orders notebook tab but no
  route/API action pair for this installed record-scoped window action.
- Live probe: BrowserSkill daemon was healthy for browser `245ea108`; the
  signed-in Odoo tab was `1770662590`. Borrowing was rejected because tab was
  already borrowed by session `olvm`; owned session `mgnu` was stopped. No
  action navigation or visual comparison was possible.
