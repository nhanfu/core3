# Menu/action inventory

| Menu | Odoo action | Core3 route | Result |
| --- | --- | --- | --- |
| Reporting > By Employee | `action_hr_available_holidays_report` | `/time-off-reporting/by-employee` | existing report retained |
| By Employee row form | standard `hr.leave` form mode | `/time-off/leave-request-detail?id=<row.id>` | implemented as `open_employee_report_request` |
