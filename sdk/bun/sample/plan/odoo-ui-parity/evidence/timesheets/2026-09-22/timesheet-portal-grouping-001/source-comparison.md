# Source comparison

Odoo 19 source:

- `addons/hr_timesheet/controllers/portal.py:39-47` exposes `none`, Date,
  Project, Parent Task, Task, and Employee group-by choices.
- `addons/hr_timesheet/controllers/portal.py:69-82` binds `groupby` to the
  authenticated `/my/timesheets` route and preserves it in pager URLs.
- `addons/hr_timesheet/controllers/portal.py:126-151` groups rows and sums
  `unit_amount` for each group.
- `addons/hr_timesheet/views/hr_timesheet_portal_templates.xml:42-47` hides
  the grouped table column.
- `addons/hr_timesheet/views/hr_timesheet_portal_templates.xml:50-89` emits
  group headers, `No Parent Task`, and `Total:` values.

Core3 mapping:

- Page `id: timesheets-portal` remains layout-only and is paired with API
  `page: { id: timesheets-portal }`.
- The page exposes Date, Project, Parent Task, Task, and Employee in its
  existing ListView group menu; the normal row columns remain unchanged.
- The API pivot now includes `parent_task_id` and `parent_task_name`.
- The API query reads persisted `timesheet_entries.parent_task_*`, normalizes
  null/blank names to `No Parent Task`, and searches the parent-task label.
- `meta.group_by_contracts` records each supported grouping field and its
  durable source.
