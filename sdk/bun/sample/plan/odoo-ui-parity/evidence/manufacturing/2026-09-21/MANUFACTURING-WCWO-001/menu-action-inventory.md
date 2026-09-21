# Menu/action inventory

| Entry | Source | Reachability |
| --- | --- | --- |
| Manufacturing / Configuration / Work Centers | `mrp.mrp_workcenter_action` | Existing Core3 Work Centers page |
| Work Center dashboard `WORK ORDERS` | object method `action_work_order` returning `mrp.action_work_orders` | Newly bound Core3 `/manufacturing/work-centers/work-orders` |
| `mrp.action_work_orders` | model `mrp.workorder`; no standalone menu | Record-scoped action only; no new menu added |

Source modes: `list,form,pivot,graph,calendar`. Source terminal domain:
`state not in ('done', 'cancel')`. Core3 route is deliberately module-qualified
because the source action has no standalone route/menu entry.
