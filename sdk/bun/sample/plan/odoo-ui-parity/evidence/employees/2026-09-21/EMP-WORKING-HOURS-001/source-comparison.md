# Source comparison

| Surface | Odoo source | Core3 contract |
| --- | --- | --- |
| Employee relation | `addons/hr/models/hr_employee.py`: `resource_calendar_id` is related to the current version | `employees.working_schedule_id` plus the legacy display name on `employees` |
| Payroll version | `addons/hr/models/hr_version.py`: `resource_calendar_id = fields.Many2one('resource.calendar', ... check_company=True)` | `employee_versions.working_schedule_id` and `schedule_name` are updated together |
| Employee form | `addons/hr/views/hr_employee_views.xml`: Payroll `resource_calendar_id` labeled Working Hours | `employee-detail` Payroll Working Hours group and `edit_employee_working_hours` action |
| Company boundary | Odoo restricts the relation to allowed company calendars | Core3 accepts active schedules that are global or match the employee current company |

The existing working-schedule catalog remains a separate configuration slice;
this feature adds the missing employee-to-schedule assignment lifecycle.
