# TIMESHEET-TASK-ACTION-DISPLAY-NAME-001

## Source-backed behavior

Odoo `hr_timesheet/views/hr_timesheet_views.xml` declares
`timesheet_action_task` with the display name `Task's Timesheets`, model
`account.analytic.line`, a task-context domain over `active_ids`, and the
Timesheets context flag. This is a record-context action distinct from the
completed task/subtask row-scope behavior.

## Core3 implementation

`services/timesheets/api/task-timesheets.yaml` adds the permission-gated,
single-row `task_timesheet_action_context` datasource. It derives the action
label and task name from durable `timesheet_tasks`, requiring the active
current-company task and returning an empty result for missing or empty
fixtures. `pages/task-timesheets.yaml` remains layout-only and renders the
resolved action title through a `StatRow`; the contracts join through
`page.id: task-timesheets`.

No migration is needed because the datasource reads the existing durable task
relation. Focused tests cover Odoo source mapping, page/API separation,
permission metadata, current-company/missing/empty guards, and file-backed
restart stability.
