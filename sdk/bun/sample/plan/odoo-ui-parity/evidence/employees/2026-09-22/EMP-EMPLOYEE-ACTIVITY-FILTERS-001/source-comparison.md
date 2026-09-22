# Source comparison

| Odoo source | Core3 contract |
| --- | --- |
| `filter_activities_my`: `activity_user_id = uid` | `my_activities` uses durable `employee_activities.activity_user_id = :current_user_id` |
| `activities_overdue`: current-user deadline before today | `activities_overdue` uses `activity_date < DATE '2026-01-15'` and excludes done activities |
| `activities_today`: current-user deadline today | `activities_today` uses `activity_date = DATE '2026-01-15'` and excludes done activities |
| `activities_upcoming_all`: current-user deadline after today | `activities_upcoming_all` uses `activity_date > DATE '2026-01-15'` and excludes done activities |
| `hr.employee` company/action scope | `employees.read` plus current-company and active Employees query scope |

Source files inspected:

- `/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml`
- `/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py`
- `services/employees/pages/employees.yaml`
- `services/employees/api/employees.yaml`
- `services/employees/migrations/20260923060000-096-employee-activity-filters.yaml`
