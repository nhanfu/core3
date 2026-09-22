# EMP-EMPLOYEE-BIRTHDAY-GROUP-001 source comparison

- Odoo source `addons/hr/views/hr_employee_views.xml` defines the Employees
  search filter `group_birthday` with `context="{'group_by': 'birthday'}"`.
- Core3 page `services/employees/pages/employees.yaml` exposes Birthday as an
  Employees group-by and optional date column.
- Core3 API `services/employees/api/employees.yaml` projects the durable
  `employees.birthday` date into the Employees datasource and pivot fields.
- This is distinct from `EMP-BIRTHDAY-VISIBILITY-001`: that slice controls
  public-directory disclosure, while this slice provides HR Employees grouping.
- No migration is required; the existing `0.0.46` migration owns the birthday
  column and deterministic fixtures.
