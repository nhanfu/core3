# Source comparison

| Odoo source | Core3 contract | Evidence |
| --- | --- | --- |
| `hr_version.py`: `employee_type = fields.Selection(...)` with Employee, Worker, Student, Trainee, Contractor, and Freelancer | `employees.employee_type` and `employee_versions.employee_type`, with migration backfill from the legacy field | Focused source-mapping and restart tests |
| `hr_employee_views.xml`: Payroll `<field name="employee_type"/>` under the HR-user boundary | Employee-detail Payroll page group, `employee_detail` projection, and `edit_employee_type` API action | Authenticated Odoo desktop/mobile captures |
| Odoo required selection | `employees.write`, actor, active/current-company employee, active Payroll version, supported-value, and stale row-version guards | Focused guard test |

The existing Core3 `employment_type` field is narrower and is retained as a
compatibility projection. This feature adds the source-backed six-value
Payroll selection rather than duplicating Contract Type or Pay Category.
