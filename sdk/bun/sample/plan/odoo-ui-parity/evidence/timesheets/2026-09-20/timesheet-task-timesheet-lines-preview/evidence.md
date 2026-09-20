# `TIMESHEET-TASK-TIMESHEET-LINES-PREVIEW`

Captured 2026-09-20 with authenticated Core3 Admin and authenticated Odoo
`codex@core3.local` on `core3_reference`.

- Core3 desktop `1440x900` and mobile `390x844` open the task Timesheets route,
  click the rendered `Print lines` action, and land on
  `/timesheets/task-lines-report-preview?id=task-demo-001`.
- Both Core3 viewports render the durable run
  `timesheet-task-lines-report-run-task-demo-001-...`, the `Complete module
  migration` task context, and the persisted `Migration work` line. Browser
  page errors and non-favicon request failures are empty; body/document widths
  are `1424/1440` desktop and `374/390` mobile.
- Odoo desktop and mobile both authenticate and render
  `/odoo/all-tasks/100`, but neither exposes a visible `Print` or report action.
  This is the exact paired blocker for executing the source
  `timesheet_report_task_timesheets` QWeb-PDF action; no Odoo PDF parity or
  sign-off is claimed.

Artifacts:

- [`results.json`](./results.json)
- [`core3-desktop-before.png`](./core3-desktop-before.png)
- [`core3-desktop-after.png`](./core3-desktop-after.png)
- [`core3-mobile-before.png`](./core3-mobile-before.png)
- [`core3-mobile-after.png`](./core3-mobile-after.png)
- [`odoo-desktop.png`](./odoo-desktop.png)
- [`odoo-mobile.png`](./odoo-mobile.png)
