# `TIMESHEET-PARENT-TASK-GROUP-001` evidence

Captured 2026-09-21 with authenticated Chromium at 1440x900 and 390x844.

## Odoo comparison

- `odoo-desktop.png` and `results.json` show authenticated
  `codex@core3.local` on `/odoo/timesheets`. The search panel is opened and
  visibly contains `Group By` with `Parent Task`, matching the source filter
  in `hr_timesheet_views.xml`.
- `odoo-mobile.png` and `results.json` show the authenticated responsive
  `/odoo/timesheets?view_type=kanban` state. The mobile Kanban renders, but
  the desktop search panel and its Parent Task control are hidden at 390px;
  mobile grouping is therefore not claimed. Aborted background action/avatar
  requests are recorded as reference noise and did not prevent rendering.

## Core3 status

Core3 authenticated capture is blocked before login by shared page discovery:
`PageSchemaError: components[0].views[0].group_by is required for kanban`.
The error is outside `services/timesheets`; `core3-blocker.json` records the
exact boundary. No Core3 screenshot or browser parity claim is fabricated.

Focused repository tests provide the page/API, durable migration, permission,
actor/company/empty, stale-concurrency, replay, and restart evidence.

Existing Odoo Print/PDF/action and broader route/action comparison blockers
remain open; this bounded feature is not Timesheets module sign-off.
