# TIMESHEET-TASK-ACTION-GRAPH-VIEW-001

## Source-backed behavior

Odoo `hr_timesheet/models/project_task.py` implements
`action_view_subtask_timesheet`. When building the action views, it replaces
the graph view with `view_hr_timesheet_line_graph_by_employee`. That source
view is the task-context graph surface for employee-oriented Timesheet
analysis; it is distinct from the already completed personal analysis pages
and report previews.

## Core3 implementation

`services/timesheets/pages/task-timesheets.yaml` adds a Graph tab to the
layout-only task page, categorizing by `employee_name` and measuring `hours`
as Time Spent while keeping the graph desktop-only. The API remains separate
in `services/timesheets/api/task-timesheets.yaml`, where the existing durable
task entry datasource already declares graph-ready employee, task, date, and
hours fields and preserves task/subtask scope, company, permission, empty, and
missing guards. The contracts remain joined by `page.id: task-timesheets`.

Migration `20260921180000-023-timesheets-task-action-graph.yaml` adds a
replay-safe task graph lookup index. Focused tests cover source mapping,
page/API separation, current-company graph-ready rows, guarded create
freshness, migration replay, and file-backed restart.
