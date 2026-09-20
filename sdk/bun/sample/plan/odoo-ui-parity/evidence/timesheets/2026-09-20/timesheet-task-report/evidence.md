# `TIMESHEET-TASK-REPORT-BINDING` evidence

Date: 2026-09-20

## Source and lifecycle

- Odoo source: `addons/hr_timesheet/report/report_timesheet_templates.xml:188-197`, record `timesheet_report_task`, model `project.task`, report type `qweb-pdf`, report name `hr_timesheet.report_project_task_timesheet`, and `binding_type=report`.
- Core3 route: `/timesheets/task-timesheets?task_id=task-demo-001`, authenticated as the seeded `admin@tms.local` user.
- Core3 action: the task context exposes `Print`; the client POSTed `/api/actions/timesheets.task_entries.print_report`, and the API persisted the deterministic report run before invoking `window.print()`.

## Core3 authenticated captures

Desktop 1440x900 and mobile 390x844 both loaded one task-timesheet row and the
Print action. Each run observed one report POST, zero page/request errors, and
body/document scroll widths equal to the viewport. The `*-before.png` files
are the loaded-state captures; the `*-after.png` files record the browser print
transition.

- `core3-desktop-before.png`
- `core3-desktop-after.png`
- `core3-mobile-before.png`
- `core3-mobile-after.png`

## Paired Odoo authenticated comparison

Authentication succeeded against the local `core3_reference` database as
`codex@core3.local`. The project/task path was reached through
`/odoo/all-tasks/100` for `S00038 - Solar Panel Installation` at both
viewports. The task form renders a `Timesheets` tab. Its authenticated Actions
menu contains `Timesheets`, `Edit Properties`, `Version History`, `Duplicate`,
`Archive`, `Delete`, `Share Task`, `Send SMS`, `Convert to Task/Sub-Task`,
`Convert to Template`, and `Actions`, but no `Print` item. The source report
binding therefore could not be executed in this reference UI; this is the
exact paired-Odoo blocker, not a parity pass. The mobile run also recorded two
aborted `/mail/data` navigation requests.

- `odoo-task-desktop.png`
- `odoo-task-desktop-actions.png`
- `odoo-task-mobile.png`
- `odoo-task-mobile-actions.png`

Passwords and tokens are not stored in this artifact. Core3's browser print
surface is not claimed to be an Odoo QWeb/PDF renderer, and the paired Odoo
report execution plus the remaining project report binding are still open.
