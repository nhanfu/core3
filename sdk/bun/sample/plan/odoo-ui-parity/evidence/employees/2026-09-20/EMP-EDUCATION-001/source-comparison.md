# Source comparison

- Odoo `addons/hr/models/hr_employee.py` defines `certificate` with Graduate,
  Bachelor, Master, Doctor, and Other choices, plus `study_field`.
- Odoo `addons/hr/views/hr_employee_views.xml` renders both in
  `hr_education_group` on the Personal tab.
- Core3 implements the fields in `api/employee-detail.yaml` and
  `api/employees.yaml`, binds them in `pages/employee-detail.yaml`, and seeds
  them in migration `20260920260000-037-employee-education.yaml`.
- `study_school` exists in the Odoo model but is not rendered in this current
  Odoo group and is intentionally outside this bounded slice.
