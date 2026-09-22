# Source comparison

| Odoo source | Existing Core3 before this slice | Change |
| --- | --- | --- |
| `addons/mrp/views/mrp_production_views.xml`, `mrp_production_action_picking_deshboard` | Only the global Manufacturing Orders action existed | Add `/manufacturing/manufacturings` with the source `list,kanban,form` modes and action metadata |
| `addons/mrp/views/stock_picking_views.xml`, MRP operation-type dashboard links | No durable operation-type scope on `mrp_productions` | Add `picking_type_id`/`picking_type_name` backfill and selected-scope query |
| Domain `[('picking_type_id', '=', active_id)]` and context `default_picking_type_id` | No selected operation-type filter or scoped create | Add query filter, company boundary, and write-permissioned scoped create action |

The source action has no standalone Manufacturing menu. Core3 therefore keeps
the Inventory operation-type menu owned by the Inventory module and exposes the
module-qualified route as the action target; it does not invent a duplicate
Manufacturing menu entry.
