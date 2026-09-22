# Source comparison

| Odoo contract | Current Core3 result |
| --- | --- |
| `action_my_days_off_dashboard_calendar` | `/time-off/dashboard-calendar` route alias |
| Model `hr.leave.report.calendar` | Durable `leave_requests` calendar projection |
| `hr_leave_employee_view_dashboard` | `ListView` Calendar mode with `mode: year` |
| `date_start=date_from`, `date_stop=date_to` | Same `date_field` and `end_date_field` |
| Empty help: `You have no time off yet!` | Same visible empty-state title |
| Personal employee context | `employee_name = 'Admin User'` fixture scope |
| Existing leave event opens dashboard form | Existing `/time-off/leave-request-detail` drilldown |

The modal target is represented by an explicit route alias because the current
Core3 declarative runtime has no standalone modal-calendar target. This is a
known bounded difference, not a claim that the Core3 route is visually
identical to Odoo's modal shell.
