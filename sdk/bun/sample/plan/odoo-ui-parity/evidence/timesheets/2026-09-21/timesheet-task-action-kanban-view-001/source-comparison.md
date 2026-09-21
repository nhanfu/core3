# TIMESHEET-TASK-ACTION-KANBAN-VIEW-001

## Source-backed behavior

Odoo `hr_timesheet/models/project_task.py` implements
`action_view_subtask_timesheet`. Its view handling accepts `kanban` and
preserves that view for the internal task action through the
`if view[1] == 'kanban'` branch. This is distinct from the graph replacement
branch implemented in Wave 40.

## Core3 implementation

`services/timesheets/pages/task-timesheets.yaml` remains layout-only and adds
a responsive Kanban view grouped by `employee_name`, with task, date,
time-spent, and status card fields. The separate
`services/timesheets/api/task-timesheets.yaml` contract remains joined by
`page.id: task-timesheets`; its durable `task_timesheet_entries` projection
supplies the rows and existing permission, current-company, missing, empty,
stale-context, and guarded-create boundaries.

Migration
`services/timesheets/migrations/20260921190000-024-timesheets-task-action-kanban.yaml`
adds a replay-safe task/company/employee/state/date lookup index. The focused
integration suite covers source mapping, page/API separation, current-company
rows, guarded durable create, migration replay, and file-backed restart.
