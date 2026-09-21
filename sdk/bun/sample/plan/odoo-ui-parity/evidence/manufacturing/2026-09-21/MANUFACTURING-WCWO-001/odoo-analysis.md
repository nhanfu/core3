# Odoo analysis

Local source: `/home/nhanjs/projects/odoo`, addon `addons/mrp`, Odoo 19
Community source checkout.

- `addons/mrp/views/mrp_workcenter_views.xml` defines
  `action_work_orders` with name **Work Orders**, model `mrp.workorder`,
  domain `state not in (done, cancel)`, context
  `search_default_workcenter_id = active_id`, and modes
  `list,form,pivot,graph,calendar`.
- The Work Center dashboard calls `action_work_order` from its `WORK ORDERS`
  control, with the selected work center and ready/progress context. The
  source list view is the create-disabled Work Order list; existing operator
  actions remain state-guarded.
- The source Work Order search exposes Work Order, Work Center, Product,
  Manufacturing Order, To Do, Blocked, In Progress, Done, and Late criteria;
  this bounded slice retains the scoped status/late/search behavior and the
  existing detail/workflow contract.

Live reference probe: browser instance `245ea108`, bsk session `nmok`, URL
`http://localhost:8069/odoo/work-centers`, using the shared authenticated QA
profile. The request rendered Discuss/OdooBot rather than Manufacturing at
desktop and at emulated iPhone 14 (`390x844`). The launcher had no
Manufacturing menu. Credentials, cookies, and tokens were not read.
