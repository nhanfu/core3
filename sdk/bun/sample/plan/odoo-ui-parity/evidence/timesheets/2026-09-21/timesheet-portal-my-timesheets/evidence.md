# TIMESHEET-PORTAL-MY-TIMESHEETS

Captured 2026-09-21 against authenticated local runtimes.

## Core3

- `admin@tms.local` authenticated against the Timesheets module agent at
  `http://127.0.0.1:4041`.
- Desktop `1440x900` and mobile `390x844` rendered
  `/timesheets/my/timesheets`, showing the durable `Migration work` row and
  `08:00` value.
- Clicking the rendered row opened the existing own-scope detail route for
  `timesheet-demo-001`; both viewports showed `TS/2026/0001` and
  `Migration work`.
- Both viewports had no page errors, no failed Core3 requests, and body width
  equal to document width.

Artifacts: `core3-desktop-portal.png`, `core3-desktop-detail.png`,
`core3-mobile-portal.png`, `core3-mobile-detail.png`.

## Odoo comparison

- `codex@core3.local` authenticated against `core3_reference` and reached
  `http://127.0.0.1:8069/my/timesheets` at both viewports.
- The source-backed page rendered Timesheets, Date, Employee, Project, Task,
  Description, Invoice, and Time Spent with search/filter/group controls on
  desktop and the responsive table on mobile.
- Odoo exposes no loaded row-to-detail action in this portal state. This is the
  exact paired interaction blocker; Core3's row action is limited to the
  existing own-scope detail route and no Odoo action parity is claimed.
- Aborted background mail/avatar/icon asset requests occurred during teardown;
  page errors were empty and the captured document fit both viewports.

Artifacts: `odoo-desktop-portal.png`, `odoo-mobile-portal.png`, and
`results.json`.
