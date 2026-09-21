# Odoo analysis

Local source revision: Odoo 19 checkout `/home/nhanjs/projects/odoo`, addon
`addons/mrp`, revision `65975996`.

The authoritative XML defines `action_work_orders` with model
`mrp.workorder`, modes `list,form,pivot,graph,calendar`, domain excluding
`done` and `cancel`, and context `search_default_workcenter_id: active_id`.
The Work Center dashboard's Reporting menu adds `Waiting Availability` through
the same object action with `search_default_waiting: 1`. Waiting work orders
can be planned; the source does not expose create/delete through this action.

Live bsk comparison on browser instance `245ea108` was attempted against
`http://localhost:8069/odoo/work-centers` and
`http://localhost:8069/web?db=core3_reference`. Both resolved to Discuss/OdooBot
and the launcher exposed no Manufacturing entry. This is an environment
blocker, not a source inference; no Odoo visual claim is recorded.
