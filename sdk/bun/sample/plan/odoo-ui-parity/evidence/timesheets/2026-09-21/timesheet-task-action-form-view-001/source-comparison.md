# TIMESHEET-TASK-ACTION-FORM-VIEW-001

## Source-backed behavior

Odoo `hr_timesheet/views/hr_timesheet_views.xml` registers
`timesheet_view_form_user` and attaches it to `timesheet_action_all` through
`timesheet_action_view_all_form`. The task Timesheets action starts from that
action and therefore retains the Form view for internal users while applying
task/subtask scope.

## Core3 implementation

`services/timesheets/pages/task-timesheets.yaml` remains layout-only and adds
a Form tab bound to the existing `timesheet-detail` side-panel page. The task
page/API pair remains joined by `page.id: task-timesheets`; the detail page
and `services/timesheets/api/entry-detail.yaml` are separately joined by
`page.id: timesheet-detail` and provide the durable entry Form data/actions.

Migration
`services/timesheets/migrations/20260921193000-027-timesheets-task-action-form.yaml`
adds a replay-safe task/company/state/date/version lookup index. Focused tests
cover source mapping, page/API separation, current-company and actor scope,
missing/empty guards, durable create, stale edit rejection, migration replay,
and file-backed restart.
