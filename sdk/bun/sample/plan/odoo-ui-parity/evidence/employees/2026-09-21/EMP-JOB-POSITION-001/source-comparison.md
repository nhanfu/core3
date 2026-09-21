# EMP-JOB-POSITION-001 source comparison

Odoo source:

- `/home/nhanjs/projects/odoo/addons/hr/models/hr_version.py` defines
  `job_id = fields.Many2one('hr.job', check_company=True, ...)`.
- `/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml` renders
  `<field name="job_id" string="Job Position" ...>` in the Work group.

Core3 implementation:

- Migration `20260922110000-065-employee-job-position-assignment.yaml` adds
  `employees.job_id` and `employee_versions.job_id`, seeds deterministic
  Core3 Vietnam job options, and backfills existing `job_position_name`
  projections replay-safely.
- `api/employee-detail.yaml` exposes `job_id`, a company-scoped options
  datasource, and `edit_employee_job_position` with actor, active-company,
  active-version, supported-job, and optimistic row-version guards.
- `pages/employee-detail.yaml` remains page-only and binds the new action in
  the existing Work > Job Position field.

The implementation intentionally keeps the legacy display name while adding
the durable relation, and permits clearing the nullable Odoo-style relation.
