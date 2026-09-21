# Source comparison

Odoo source:

- `addons/hr/models/hr_version.py` defines `wage` as a Monetary Payroll field.
- `addons/hr/views/hr_employee_views.xml` renders `wage` in the manager-only
  Payroll page's Contract Overview and exposes it in employee list views.

Core3 mapping:

- The existing `employee_detail` API already projects employee `wage`; this
  slice adds `edit_employee_wage`, a dedicated `employees.manage` mutation that
  updates both the employee projection and the current active
  `employee_versions.wage`.
- The page adds a read-only Payroll Wage group and an `Edit Wage` header action;
  API/action YAML remains separate from page YAML and joins by
  `page.id: employee-detail`.
- Migration `20260922100000-064` replay-safely reconciles existing employee and
  active Payroll wages before the guarded action is used.

Boundaries:

- Actor identity, active/current-company employee, non-negative wage, active
  Payroll version, and optimistic employee/version concurrency are enforced.
- No Pay Category behavior is changed; this slice only synchronizes the
  source-backed monetary Wage field.
