# Source comparison

| Odoo contract | Core3 implementation | Status |
| --- | --- | --- |
| `hr_leave_report_action`, `graph,pivot` | `/time-off-analysis`, visible Graph/Pivot tabs | Implemented |
| `hr.leave.report` allocation/request union | `time_off_analysis_report` CTE over `leave_allocations` and `leave_requests` | Implemented |
| Positive allocations and negative requests | `number_of_days` and `number_of_hours` signed in API SQL | Implemented |
| Employee/type/month grouping | Pivot rows employee/type, month columns; graph employee/type series | Implemented |
| Department and company context | Migration-backed fields and report filters; fixed company seed | Implemented bounded scope |
| Odoo read-only action | Read-only page/API; no create/edit/delete actions | Implemented |
| Odoo empty/help state | `No data yet!` plus fixture empty state | Implemented |
| Odoo live menu/action evidence | `/odoo/time-off` resolves to Discuss in `core3_reference` | Blocked |
