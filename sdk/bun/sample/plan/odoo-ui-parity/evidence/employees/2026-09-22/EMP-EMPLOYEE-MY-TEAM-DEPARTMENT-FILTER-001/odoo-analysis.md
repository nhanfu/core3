# Odoo analysis

- Addon: `hr`, Odoo 19 Community source at `/home/nhanjs/projects/odoo`.
- Search view: `addons/hr/views/hr_employee_views.xml` defines
  `my_team` as `parent_id.user_id = uid` and `my_department` as
  `member_of_department = True`.
- Model behavior: `addons/hr/models/hr_version.py` computes department
  membership from the current employee's department and descendants; the
  employee search view exposes both filters to ordinary Employees readers.
- The live authenticated Odoo tab was identified at
  `http://localhost:8069/odoo/crm`, but the task-owned bsk session could not
  borrow tab `1770662590`: bsk returned `tab is borrowed by another session`
  and identified session `ojpy`. No live filter state was inspected or
  captured in this run.
