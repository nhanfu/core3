# Timesheets — sub-plan

Status: `planning`

## Reference

- Odoo addon: `hr_timesheet` (Odoo 19 Community)
- Source availability: available in the supplied Odoo checkout
- Odoo demo data: manifest/demo records available; include submitted/validated and empty modes
- Core3 service: `timesheets`

## UI inventory

- Timesheets dashboard, My Timesheets, All Timesheets, To Approve, Billing, and Reporting menus.
- Weekly timesheet grid with employee/project/task rows, date columns, totals, editable cells, lock/submission status, period navigation, filters, and mobile entry.
- Timesheet list/form with employee, date, project, task, description, hours, analytic account, unit, approval actions, import/export, search/group, and pager.
- Project/employee analysis graph/pivot, billing/utilization summaries, approval dialogs, empty state, and responsive card/list views.

## Core3 backend mock-data plan

Declare `timesheet_lines`, `timesheet_periods`, `timesheet_employees`, `timesheet_projects`, `timesheet_tasks`, `timesheet_approvals`, `timesheet_billing`, and `timesheet_analysis`. `default` contains multiple employees/projects/tasks, weekly cells, totals, draft/submitted/validated lines, and billing metrics. States: `current_week`, `previous_week`, `to_approve`, `validated`, `empty`, `employee_grouped`, `analysis_graph`, `analysis_pivot`, `mobile`.

## Shared UI primitives

Timesheet grid, date/period navigation, editable numeric cells, list/form, approval/status bar, analytic relations, graph/pivot, totals cards, search/filter/group, pager, and mobile entry controls.

## Screenshots

Capture Odoo/Core3 at 1440x900 and 390x844 for dashboard, weekly grid, list/form, approval queue, billing/utilization reports, and empty state.

## Acceptance criteria

- Timesheet menus, grid geometry, totals, status/submission actions, billing/report views, and mobile entry match Odoo.
- Backend YAML provides every visible cell, total, line, relation, approval state, billing value, report point/cell, and empty state.
- Period navigation, edit/save/discard, submit/approve, filters/grouping, and responsive rendering work offline with query-replaceable datasources.
