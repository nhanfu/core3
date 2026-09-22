# Menu/action inventory

| Source | Label | Model/view | Core3 |
| --- | --- | --- | --- |
| `hr_leave_report_action` | Time Off Analysis | `hr.leave.report`, graph/pivot | `/time-off-analysis`, `time-off-analysis` |
| Employee dashboard report dropdown | Time Off | invokes `hr_leave_report_action` | Stable Core3 route retained through Time Off Reporting menu alias |
| Search filters | Employee, Time Off Type, Department, Start Date, To Approve, Approved, Allocations | `hr.leave.report` search view | Status, request type, employee, department, search, date parameters |

The Core3 alias remains visible under Reporting because the existing route was
already part of this checkout; the underlying page/API contract now matches the
selected installed action rather than the former status-count approximation.
