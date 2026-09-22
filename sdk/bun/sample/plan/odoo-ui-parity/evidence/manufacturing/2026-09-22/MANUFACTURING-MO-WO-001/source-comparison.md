# Source comparison

| Odoo | Core3 |
| --- | --- |
| `action_mrp_workorder_production_specific` | `/manufacturing-orders/detail/work-orders` |
| `mrp.workorder` | durable `mrp_workorders` joined to `mrp_productions` |
| `list,form,calendar,pivot,graph` | same five visible modes |
| `production_id = active_id` | required `:id` production scope |
| Existing-record operator workflow | existing `mrp_workorders` guarded transitions |
| No action-specific create/delete surface | no create/delete actions declared |

The existing Work Order detail page is reused for the form mode; no duplicate
detail contract is introduced.
