# Menu/action inventory

| Source menu/control | Source XML/action | Model | Modes | Core3 route |
| --- | --- | --- | --- | --- |
| Manufacturing / Configuration / Work Centers / Waiting Availability | Work Center kanban `action_work_order` with `search_default_waiting=1`; window action `action_work_orders` | `mrp.workorder` | `list,form,pivot,graph,calendar` | `/manufacturing/work-centers/waiting-availability` |

The link is a Work Center dashboard control, not a new standalone menu. The
selected work center is passed as `active_id` in Odoo and as durable
`workcenter_id` plus display `workcenter` in Core3. The Core3 detail navigation
reuses `/workorders/detail` and the existing `mrp_workorders` workflow.
