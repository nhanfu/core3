# `TIMESHEET-REPORT-TASK-DRILLDOWN`

Captured 2026-09-20 with authenticated Core3 Admin and authenticated Odoo
`codex@core3.local` on `core3_reference`.

- Core3 desktop `1440x900` and mobile `390x844` switch the By Task report to
  List, click the rendered `Complete module migration` row, and navigate to
  `/timesheets/task-timesheets?task_id=task-demo-001`.
- Both Core3 viewports render the task-scoped persisted `Migration work` line
  with no page errors, failed requests, or horizontal overflow.
- Odoo desktop and mobile authenticate and render `/odoo/timesheets-by-task`
  with aggregate report data, but neither exposes a loaded row-to-task-
  timesheet context action/form. The Odoo analysis form source contract is
  covered by the focused test; paired row-action execution remains blocked.

Artifacts:

- [`results.json`](./results.json)
- [`core3-desktop-before.png`](./core3-desktop-before.png)
- [`core3-desktop-after.png`](./core3-desktop-after.png)
- [`core3-mobile-before.png`](./core3-mobile-before.png)
- [`core3-mobile-after.png`](./core3-mobile-after.png)
- [`odoo-desktop.png`](./odoo-desktop.png)
- [`odoo-mobile.png`](./odoo-mobile.png)
