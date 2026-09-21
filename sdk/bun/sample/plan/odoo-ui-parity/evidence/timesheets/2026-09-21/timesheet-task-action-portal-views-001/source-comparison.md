# Timesheets Wave 45 source comparison

## Odoo

`/home/nhanjs/projects/odoo/addons/hr_timesheet/models/project_task.py`
defines the non-internal/project-sharing branch of
`project.task.action_view_subtask_timesheet`. It removes unsupported view
types and substitutes `hr_timesheet_line_portal_tree`,
`timesheet_view_form_portal_user`, and
`view_kanban_account_analytic_line_portal_user`.

The corresponding portal Form and Kanban records are in
`/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_timesheet_views.xml`.
The portal substitution and fallback behavior are exercised by
`/home/nhanjs/projects/odoo/addons/hr_timesheet/tests/test_portal_timesheet.py`.

## Core3

- `services/timesheets/pages/portal-task-timesheets.yaml` and
  `services/timesheets/api/portal-task-timesheets.yaml` implement the guarded
  portal list/Kanban route and row navigation.
- `services/timesheets/pages/portal-task-timesheet-detail.yaml` and
  `services/timesheets/api/portal-task-timesheet-detail.yaml` implement the
  read-only detail route and back action.
- Migration
  `20260921194000-028-timesheets-task-action-portal-views.yaml` persists the
  portal task grant and lookup index.
- `test/timesheets_task_action_portal_views.integration.test.ts` verifies the
  source mapping, contracts, durable scope, guards, migration replay, and
  restart behavior.
