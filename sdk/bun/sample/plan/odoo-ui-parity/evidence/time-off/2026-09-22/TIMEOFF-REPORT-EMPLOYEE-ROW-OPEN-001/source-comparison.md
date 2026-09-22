# Source comparison

| Odoo | Core3 |
| --- | --- |
| `action_hr_available_holidays_report` targets `hr.leave` | `time_off_employee_report` selects `r.id` from durable `leave_requests` |
| Action modes include `form` after list/graph/pivot/calendar | `open_employee_report_request` navigates to `/time-off/leave-request-detail` |
| Form mode is the standard leave form | Core3 reuses `leave-request-detail` and its status/workflow/404/503 contract |
| Report access is read-only | Navigation and report datasource require `time_off.read`; no report mutation added |
