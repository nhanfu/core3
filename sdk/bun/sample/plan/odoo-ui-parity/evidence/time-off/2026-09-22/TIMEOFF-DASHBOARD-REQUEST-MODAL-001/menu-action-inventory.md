# Menu and action inventory

| Odoo surface | Stable ID | Core3 surface | Result |
| --- | --- | --- | --- |
| Time Off dashboard > New | `hr_leave_action_new_request` | `/time-off` dashboard toolbar | Existing owner retained |
| Dashboard request modal | `hr_leave_action_my_request` | `dashboard_new_request` YAML server form | Implemented |
| Modal form view | `hr_leave_view_form_dashboard_new_time_off` | Time Off dashboard API form fields | Implemented as declarative contract |
| Request persistence | `hr.leave` | `leave_requests` durable table | Existing table reused |
