# TIMESHEET-TASK-ACTION-PIVOT-VIEW-001

## Source-backed behavior

Odoo `hr_timesheet/views/hr_timesheet_views.xml` defines
`view_hr_timesheet_line_pivot` with employee rows, date columns, `unit_amount`
as the Time Spent measure, and `amount` as Timesheet Costs. The task action
starts from `timesheet_action_all`, so the internal task action retains that
Pivot view while applying task/subtask scope.

## Core3 implementation

`services/timesheets/pages/task-timesheets.yaml` remains layout-only and adds
a desktop Pivot tab with employee rows, work-date columns, Time Spent and
Timesheet Costs measures, and weekly date ranges. The separate
`services/timesheets/api/task-timesheets.yaml` contract remains joined by
`page.id: task-timesheets`; durable `task_timesheet_entries` supplies the
current-company task rows and a persisted cost projection.

Migration
`services/timesheets/migrations/20260921192000-026-timesheets-task-action-pivot.yaml`
adds a replay-safe task/company/employee/date/unit-cost lookup index. Focused
tests cover source mapping, page/API separation, current-company rows, cost
measure, guarded create, stale edit rejection, migration replay, and restart.
