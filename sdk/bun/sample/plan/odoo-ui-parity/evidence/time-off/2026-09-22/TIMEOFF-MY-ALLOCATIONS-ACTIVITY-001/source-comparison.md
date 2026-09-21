# Source comparison

| Odoo source behavior | Existing Core3 before slice | Change |
| --- | --- | --- |
| `hr_leave_allocation_action_my` includes `activity` and current-user allocation scope | `pages/my-allocations.yaml` had only List/Cards | Added visible Activity tab, date fields, schedule hooks, and Odoo labels |
| Activity cards show employee, days, and Time Off Type | API returned only allocation fields | Added durable activity-slot join and activity fields to `my_allocations` |
| Activity scheduling is an authenticated action | No personal allocation activity action | Added `schedule_my_allocation_activity` with `time_off.write`, validation, and row-version guard |
| Allocation data persists across reload | No activity metadata table | Added migration `0.0.23`, deterministic seeds, and new-allocation slot creation step |

Changed module-owned paths are the Time Off page/API, migration, and focused
and affected Time Off tests. No shared UI/runtime or other module path was
changed.
