# `TIMESHEET-PROJECT-REPORT-BINDING` evidence

Date: 2026-09-20

## Source and lifecycle

- Odoo source: `addons/hr_timesheet/report/report_timesheet_templates.xml:199-213`, record `timesheet_report_project`, model `project.project`, report type `qweb-pdf`, report name `hr_timesheet.report_timesheet_project`, and project binding.
- Core3 entry point: authenticated Project detail `/project/projects/detail?id=project-demo-001`, then `Actions > Timesheets`, which resolves to `/timesheets/project-timesheets?project_id=project-demo-001`.
- Core3 action: the project-context page exposes `Print`; the client POSTed `/api/actions/timesheets.project_entries.print_report` and received HTTP 200 before the browser print transition.

## Core3 authenticated captures

Desktop 1440x900 and mobile 390x844 both show the project detail action path
and the project Timesheets list with eight deterministic entries. Both report
runs observed one HTTP 200 report POST, zero page/request errors, and body and
document scroll widths equal to the viewport. The `*-before.png` files are the
loaded-state captures; the `*-after.png` files record the browser print state.

- `core3-desktop-project-detail.png`
- `core3-desktop-before.png`
- `core3-desktop-after.png`
- `core3-mobile-project-detail.png`
- `core3-mobile-before.png`
- `core3-mobile-after.png`

## Paired Odoo authenticated comparison

Authentication succeeded against the local `core3_reference` database as
`codex@core3.local`. The project form route `/odoo/project/5` for `Home
Construction` loaded at both viewports. Its Actions menu contains
`Timesheets`, `Duplicate`, `Archive`, `Delete`, and `Convert to Template`, but
does not expose `Print`; the source report binding could not be executed in
this reference UI. This is the exact paired-Odoo blocker, not a parity pass.

- `odoo-project-desktop.png`
- `odoo-project-desktop-actions.png`
- `odoo-project-mobile.png`
- `odoo-project-mobile-actions.png`

Both Odoo runs reported zero page/request errors and viewport-matched scroll
widths. Passwords and tokens are not stored in this artifact. Core3's browser
print surface is not claimed to be an Odoo QWeb/PDF renderer; full route/action
comparison and the remaining module gates stay open.
