# EMP-DEPARTMENT-001 source comparison

Odoo source:

- `/home/nhanjs/projects/odoo/addons/hr/models/hr_version.py` defines
  `department_id = fields.Many2one('hr.department', check_company=True, ...)`.
- `/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml` renders
  `<field name="department_id"/>` in the employee Work group and exposes the
  same relation in employee search/list views.

Core3 implementation:

- Migration `20260922120000-066-employee-department-assignment.yaml` adds
  `employee_versions.department_id` and replay-safely backfills the active and
  historical version projection from the existing employee relation.
- `api/employee-detail.yaml` exposes `department_id`, a company-scoped active
  Department options datasource, and `edit_employee_department` with actor,
  active-company, active-version, supported-department, and optimistic
  row-version guards.
- `pages/employee-detail.yaml` remains page-only and binds the new action to
  the existing Work > Department field.

The existing Core3 Vietnam Engineering fixture is used so this slice adds no
shared department catalog rows; clearing the nullable relation is supported.
