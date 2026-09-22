# Odoo source analysis

Source inspected locally under `/home/nhanjs/projects/odoo`:

- `addons/hr/models/hr_department.py:205-206` defines
  `get_children_department_ids()` with the Odoo `child_of` domain.
- `addons/hr/models/hr_department.py:208-215` defines
  `action_open_view_child_departments()`, opening `hr.department` in
  `kanban`, `list`, and `form` views with domain `id in child_of_ids` and
  action name `Child departments`.
- `addons/hr/views/hr_department_views.xml:89-94` adds the kanban menu anchor
  `action_open_view_child_departments` with label `Child departments`.

The Odoo action includes the selected department itself because the `child_of`
domain is evaluated against the selected department ID. Core3 preserves that
behavior with a recursive CTE.
