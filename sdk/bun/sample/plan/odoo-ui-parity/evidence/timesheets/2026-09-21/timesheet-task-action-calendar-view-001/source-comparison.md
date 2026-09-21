# TIMESHEET-TASK-ACTION-CALENDAR-VIEW-001

## Source-backed behavior

Odoo's `timesheet_action_all` declares list, form, Kanban, pivot, and graph
views plus a Calendar view. `project.task.action_view_subtask_timesheet`
starts from that action, retains Calendar for internal users, and replaces
only the graph view while restricting the domain to the task and descendants.

## Core3 implementation

`services/timesheets/pages/task-timesheets.yaml` remains layout-only and adds
a Calendar tab using `work_date`, `calendar_display_name`, employee, task,
description, and time-spent fields. The separate
`services/timesheets/api/task-timesheets.yaml` contract remains joined by
`page.id: task-timesheets`; its durable `task_timesheet_entries` projection
now exposes the calendar label while retaining current-company, permission,
missing, empty, task-scope, and guarded mutation behavior.

Migration
`services/timesheets/migrations/20260921191000-025-timesheets-task-action-calendar.yaml`
adds a replay-safe task/company/date/employee lookup index. Focused tests cover
source mapping, page/API separation, durable current-company rows, guarded
create, stale edit rejection, migration replay, and file-backed restart.
