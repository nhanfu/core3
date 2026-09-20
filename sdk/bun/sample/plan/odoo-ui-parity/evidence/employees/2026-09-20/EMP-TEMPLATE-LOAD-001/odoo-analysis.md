# Odoo analysis

- Addon: `hr`, Odoo 19 Community, local authenticated instance.
- `views/hr_employee_views.xml` exposes `hr_version_wizard_action`, label
  `Load a Template`, from the employee Payroll tab to `hr.group_hr_user`.
- `wizard/hr_contract_template_wizard.py` defines transient model
  `hr.version.wizard`, required `contract_template_id`, company domain, and
  `action_load_template`.
- The wizard copies `_get_whitelist_fields_from_template()` values and links
  the selected template to `employee.version_id.contract_template_id`.
- Authenticated Abigail Peterson captures at `/odoo/employees/6` show the
  Payroll action and Contract Template Load modal on desktop and mobile.
