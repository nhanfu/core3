# Source comparison

| Odoo behavior | Existing Core3 before slice | Bounded change |
| --- | --- | --- |
| Work Center record-scoped `action_work_orders` | Only global `/workorders` contract existed | Add `/manufacturing/work-centers/work-orders` page/API pair |
| Domain excludes done/cancel | Global query included all six lifecycle fixtures unless default filters were supplied | Scoped query applies `state NOT IN ('Finished', 'Cancelled')` |
| Selected work center from `active_id` | Global query accepted only a work-center name | Scoped API accepts durable ID and name, resolving ID to the persisted center |
| Modes list/form/pivot/graph/calendar | Global action also had Kanban and a different default-filter contract | New page exposes the exact five source modes as visible tabs |
| Existing operator transitions | Already implemented in `mrp_workorders` workflow | Reuse same action names/guards with scoped refresh |
| Durable data | Existing `mrp_workorders` migration fixtures | Reuse existing rows; migration 021 adds only a query index |
| Source action has no standalone menu | No new MRP menu is required | Reach through Work Center Overview navigation; route is an explicit Core3 alias |
