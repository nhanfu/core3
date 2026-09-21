# Source comparison

| Odoo source | Core3 contract |
| --- | --- |
| `hr.employee.company_id` in `hr_employee.py` | `employees.company_id` and `employee_versions.company_id` in migration `20260922190000-073` |
| Work-tab `<field name="company_id" groups="base.group_multi_company"/>` | Work-tab Company projection plus permissioned `edit_employee_company` page action |
| `res.company` active selection | Employees-owned `employee_companies` catalog and `employee_company_options` API datasource |
| Odoo company-check boundary | Current-company employee guard, active-company guard, actor guard, active Payroll-version guard, and row-version concurrency |

The Core3 page YAML contains only the visible action and field binding. SQL,
options, persistence, and guards remain in the API/migration contracts.
