# Timesheets Wave 46 source comparison

## Odoo

`/home/nhanjs/projects/odoo/addons/hr_timesheet/models/project_task.py`
defines `_get_portal_total_hours_dict`. It filters to timesheetable tasks,
removes descendant tasks from the set used for totals, then returns
`allocated_hours` and `effective_hours`.

`/home/nhanjs/projects/odoo/addons/hr_timesheet/views/project_task_portal_templates.xml`
uses that result in the portal task list's `Total` cell. The same template
renders task time spent versus allocated time and progress in the portal task
surface.

## Core3

- `services/timesheets/pages/portal-task-timesheets.yaml` adds a layout-only
  `StatRow` bound to `portal_task_timesheet_hours`.
- `services/timesheets/api/portal-task-timesheets.yaml` adds the separate
  single-row summary datasource under the existing
  `page: { id: portal-task-timesheets }` contract. It sums direct parent task
  entries, preserving child rows in the list without double-counting them in
  the parent total.
- Migration
  `20260921200000-029-timesheets-portal-task-hours-summary.yaml` persists the
  task `allow_timesheets` flag and lookup index.
- `test/timesheets_portal_task_hours_summary.integration.test.ts` verifies
  source mapping, durable values, de-duplication, guards, relation refresh,
  and restart behavior.
