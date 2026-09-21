# Source comparison

| Surface | Odoo source | Core3 contract |
| --- | --- | --- |
| Employee relation | `addons/hr/models/hr_version.py`: `address_id` is the company-scoped Work Address relation | `employees.work_address_id` plus the existing `address_name` display value |
| Employee form | `addons/hr/views/hr_employee_views.xml`: Work > Location renders `address_id` before Work Location | `employee-detail` Work > Location projection and `edit_employee_work_address` action |
| Company boundary | Odoo requires a company-valid partner/address relation | Core3 accepts active addresses available to the employee current company |
| Persistence | Odoo keeps the relation on the current version | Core3 updates employees and the active Payroll version together |
