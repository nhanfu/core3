# Menu and action inventory

| Source surface | Action/model | Context/domain | Modes |
| --- | --- | --- | --- |
| Manufacturing / Configuration / Work Centers / Work Center Overview `Late` link | `mrp.action_work_orders` / `mrp.workorder` | `search_default_late=1`; selected center via `search_default_workcenter_id`; excludes `done`, `cancel` | `list,form,pivot,graph,calendar` |

Core3 deliberately adds no standalone menu. The Overview row action navigates
to `/manufacturing/work-centers/late-orders` with durable `workcenter_id`,
`workcenter`, and `search_default_late=true`.
