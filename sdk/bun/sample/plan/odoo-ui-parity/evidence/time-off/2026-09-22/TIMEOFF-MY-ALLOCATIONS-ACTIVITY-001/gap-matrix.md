# Gap matrix

| ID | Odoo action/view | Gap | Core3 resolution | Evidence |
| --- | --- | --- | --- | --- |
| G-001 | `hr_leave_allocation_action_my` / Activity | Missing personal Activity tab | Added `Activity` to `pages/my-allocations.yaml`, desktop-only with responsive fallback contract | ACT-001 |
| G-002 | `hr_leave_allocation_view_activity` | No durable activity fields or slots | Added `time_off_my_allocation_activities`, seeded records, joined datasource, and new-allocation slot insertion | ACT-002, ACT-006 |
| G-003 | Activity schedule affordance | No personal scheduling action | Added server form with `time_off.write`, type/date/summary guards, and row-version concurrency | ACT-003, ACT-005 |
| G-004 | Authenticated visual comparison | Reference database lacks `hr_holidays`; Core3 runtime fails before page load | Recorded exact captures/errors; no visual parity claim | ACT-008 |
