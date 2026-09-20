# Source comparison

## Odoo

- `/home/nhanjs/projects/odoo/addons/hr/models/hr_version.py` defines the
  manager-only `structure_type_id` relation (`Salary Structure Type`).
- `/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml` renders
  that relation in Payroll as `<field name="structure_type_id"
  string="Pay Category" .../>`.

## Core3

- Migration `20260922020000-056-employee-pay-category.yaml` adds durable
  `pay_category_name` columns to `employees` and `employee_versions` with
  deterministic fixtures.
- `pages/employee-detail.yaml` adds the manager-gated Payroll projection and
  Edit Pay Category action; `api/employee-detail.yaml` adds the paired
  datasource/action contract.
- The action requires `employees.manage`, actor identity, active/current
  company scope, supported values, an active Payroll record, and optimistic
  row-version concurrency before updating both employee and current record.

Core3 models the supplied payroll structure names as the bounded supported
values `Employee`, `Worker`, and `Contractor`.
