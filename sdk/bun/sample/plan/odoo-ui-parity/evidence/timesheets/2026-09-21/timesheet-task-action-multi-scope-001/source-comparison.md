# TIMESHEET-TASK-ACTION-MULTI-SCOPE-001

## Source-backed behavior

Odoo `hr_timesheet/views/hr_timesheet_views.xml` declares
`timesheet_action_task` for `account.analytic.line` with the domain
`task_id in active_ids`, the `is_timesheet` context flag, and list view mode.
This action opens timesheets for multiple selected tasks. It is distinct from
the prior task action display-name slice and from descendant expansion for one
task.

## Core3 implementation

`services/timesheets/api/task-timesheets.yaml` accepts a comma-separated
`task_ids` context, reads only selected durable tasks and their entries in the
current company, and exposes the permission-gated `task_timesheet_scope`
aggregate. The existing single-task and optional subtask paths remain intact.
The create mutation requires the new task to belong to the supplied context,
canonicalizes the durable task/company relation, and rejects missing, stale,
closed, or foreign-company selections. `pages/task-timesheets.yaml` remains
layout-only and renders the aggregate through a `StatRow`; both contracts join
through `page.id: task-timesheets`.

No new migration is needed: the scope reads and mutations reuse the durable
task and timesheet-entry relations already established by earlier slices.
Focused tests cover source mapping, page/API separation, current-company
multi-task reads, permission/empty/missing/stale/company guards, durable create,
and file-backed restart behavior.
