# Odoo analysis

- Source: `/home/nhanjs/projects/odoo/addons/mrp`, Odoo 19.
- Work Center Overview source: `mrp_workcenter_kanban` in
  `mrp_workcenter_views.xml`.
- The `Late` link calls `action_work_order` with
  `search_default_late=1`; `action_work_order` returns `mrp.action_work_orders`.
- `action_work_orders` uses model `mrp.workorder`, modes
  `list,form,pivot,graph,calendar`, domain excluding `done` and `cancel`, and
  context `search_default_workcenter_id: active_id`.
- The source search view defines Late as `date_start <= today`.
- Live authenticated result: `/odoo/work-centers?db=core3_reference` rendered
  Discuss/OdooBot without a Manufacturing launcher. This is a source/runtime
  access blocker, not evidence of an empty Late result.
