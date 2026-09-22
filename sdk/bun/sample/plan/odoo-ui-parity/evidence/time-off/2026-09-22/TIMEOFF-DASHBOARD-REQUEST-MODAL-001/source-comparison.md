# Source comparison

| Odoo contract | Core3 implementation | Result |
| --- | --- | --- |
| `hr_leave_action_my_request` | `dashboard_new_request` in `api/time-off-dashboard.yaml` | PASS |
| `Time Off Request`, form, `target=new` | YAML `server_form`, `title`, Save/Discard | PASS |
| Dashboard action uses `hr_leave_view_form_dashboard_new_time_off` | Dashboard toolbar opens the service-owned form action | PASS, bounded declarative equivalent |
| Employee is the current employee | Fixed deterministic `employee-demo-001` / `Admin User` fixture | PASS |
| Active `holiday_status_id` relation | `time_off_dashboard_leave_types` lookup | PASS |
| Dates, duration, description | From, To, Duration (days), Description fields | PASS |
| Create persists an `hr.leave` draft | Insert into durable `leave_requests` with state `Draft` | PASS, semantic storage |
| Odoo app/modal visual surface | `core3_reference` route showed Discuss | BLOCKED by live reference state |
