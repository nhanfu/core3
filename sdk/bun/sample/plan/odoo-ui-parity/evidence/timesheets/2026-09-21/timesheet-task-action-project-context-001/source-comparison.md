# TIMESHEET-TASK-ACTION-PROJECT-CONTEXT-001

## Source-backed behavior

Odoo `hr_timesheet/models/project_task.py` implements
`action_view_subtask_timesheet`. It gathers the task and descendants for the
Timesheets domain and sets the action context to
`default_project_id: self.project_id.id`. The project default is distinct from
the completed descendant-row scope and `active_ids` multi-task action slices.

## Core3 implementation

`services/timesheets/api/task-timesheets.yaml` adds the permissioned,
single-row `task_timesheet_entry_defaults` datasource. It derives the active
task, project, company, and open/timesheetable relation from durable tables in
the current company. The existing task create form is source-prefilled through
that datasource, canonicalizes task/project values after insert, and rejects a
stale project context or task/project mismatch before writing. The new
`timesheet_tasks_project_context_idx` migration makes the relation durable and
replay-safe without adding a duplicate state model.

`services/timesheets/pages/task-timesheets.yaml` remains layout-only and
renders the source context as a `StatRow`; the API/page contracts join through
`page.id: task-timesheets`. Focused tests cover source mapping,
page/API separation, permission/company/missing/empty guards, canonicalized
CRUD, stale relation rejection, migration replay, and file-backed restart.
