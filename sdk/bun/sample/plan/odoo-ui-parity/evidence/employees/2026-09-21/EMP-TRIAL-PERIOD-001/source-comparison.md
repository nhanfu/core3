# EMP-TRIAL-PERIOD-001 source comparison

- Odoo model source: `/home/nhanjs/projects/odoo/addons/hr/models/hr_version.py`
  defines `trial_date_end = fields.Date('End of Trial Period', ...)` on
  `hr.version`, manager-only and tracked.
- The Employee form source is
  `/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml`.
  Its Payroll form exposes Contract, Wage, Employee Type, Contract Type, Pay
  Category, and Working Hours, but does not render `trial_date_end`; the
  source-backed field is therefore explicitly recorded as a reference-view
  limitation rather than claimed as an Odoo visual match.
- Core3 migration `20260922150000-069-employee-trial-period.yaml` adds
  replay-safe `trial_date_end` columns to `employees` and `employee_versions`
  and seeds deterministic dates for the existing employee fixtures.
- Core3 API `employee-detail.yaml` owns the guarded
  `edit_employee_trial_period` manager action; page YAML owns the Payroll
  Trial Period group and header action. They join through `page.id`.
