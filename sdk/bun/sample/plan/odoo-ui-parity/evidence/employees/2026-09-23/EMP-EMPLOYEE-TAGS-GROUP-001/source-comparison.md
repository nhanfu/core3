# Source comparison

Odoo source: `/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml`.

- The employee search view declares `group_category_ids`, label `Tags`, and
  `context="{'group_by': 'category_ids'}"`.
- The authenticated `Employees` action exposed `Tags` in the Group By menu
  during the BrowserSkill run against `core3_reference`.
- Core3 keeps the page/API boundary: both contracts use `page.id: employees`.
- `services/employees/api/employees.yaml` projects the durable
  `employee_tag_rel` / `employee_tags` relation as `employee_tags`, includes it
  in pivot fields, and searches tag names.
- `services/employees/pages/employees.yaml` exposes `{ field: employee_tags,
  label: Tags }` in group-by and a hidden-by-default Tags column.

The existing tag relation and seed are owned by
`migrations/20260922130000-067-employee-tags.yaml`; no new migration is
needed.
