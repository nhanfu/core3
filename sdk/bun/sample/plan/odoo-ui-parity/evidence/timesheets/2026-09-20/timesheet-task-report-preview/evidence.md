# `TIMESHEET-TASK-REPORT-PREVIEW`

Captured 2026-09-20 against the authenticated Core3 module runner at
`http://127.0.0.1:4041` and authenticated Odoo `core3_reference` at
`http://127.0.0.1:8069`.

Core3 used `admin@tms.local` / `admin123`, opened the task Timesheets action
for `task-demo-001`, clicked the task `Print` action, and followed the
YAML-owned `/timesheets/task-report-preview?id=task-demo-001` route. Desktop
and mobile both persisted the task report run, rendered the task summary and
the persisted line, returned no page/request failures, and stayed within the
viewport (`1440/1440` and `390/390`).

Odoo used `codex@core3.local` / `Core3Odoo2026!` in `core3_reference` and
opened `/odoo/all-tasks/100` at both viewports. The authenticated task route
rendered without page/request failures, but its loaded Actions surface had no
visible Timesheets Print/report action. The source `timesheet_report_task` is
therefore an exact paired-reference blocker; no Odoo QWeb/PDF execution parity
is claimed.

The machine-readable result is in `results.json`; screenshots are the paired
desktop/mobile Core3 task route/preview and Odoo task reference states.
