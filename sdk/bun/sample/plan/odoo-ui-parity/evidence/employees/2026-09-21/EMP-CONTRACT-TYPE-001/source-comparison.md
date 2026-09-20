# Source comparison

- Odoo model: `/home/nhanjs/projects/odoo/addons/hr/models/hr_version.py`
  defines `contract_type_id` as the Payroll `hr.contract.type` relation and
  manager-scoped field.
- Odoo employee form:
  `/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml` renders
  `contract_type_id` as `Contract Type` inside the Payroll contract group.
- Odoo catalog action: `hr_contract_type_action` is a list-only, inactive
  configuration menu in `hr_contract_type_views.xml` / `hr_views.xml`; this
  slice does not invent a visible catalog route.
- Core3 page/API join: both contracts use page id `employee-detail`.
  `pages/employee-detail.yaml` renders a manager-only Contract Overview and
  `api/employee-detail.yaml` provides the guarded action and detail projection.
- Core3 storage: migration `20260921200000-050-employee-contract-type.yaml`
  adds `employees.contract_type_name`, seeds deterministic values, and the
  action synchronizes the current active `employee_versions` row.
