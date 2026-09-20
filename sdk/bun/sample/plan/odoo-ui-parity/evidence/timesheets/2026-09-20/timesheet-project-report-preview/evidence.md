# `TIMESHEET-PROJECT-REPORT-PREVIEW`

Captured 2026-09-20 against the authenticated Core3 module runner at
`http://127.0.0.1:4041` and authenticated Odoo `core3_reference` at
`http://127.0.0.1:8069`.

Core3 used `admin@tms.local` / `admin123`, opened the project Timesheets
action for `project-demo-001`, clicked `Print`, and followed the YAML-owned
`/timesheets/project-report-preview?id=project-demo-001` route. Desktop and
mobile both persisted the report run, rendered the project summary and eight
timesheet lines, returned no page/request failures, and stayed within the
viewport (`1440/1440` and `390/390`).

Odoo used `codex@core3.local` / `Core3Odoo2026!` in `core3_reference` and
opened `/odoo/project/5` at both viewports. The authenticated project form
rendered without page/request failures, but its loaded Actions surface had no
visible Timesheets Print/report action. The source `timesheet_report_project`
is therefore an exact paired-reference blocker; no Odoo QWeb/PDF execution
parity is claimed.

The machine-readable result is in `results.json`; screenshots are the paired
desktop/mobile Core3 project route/preview and Odoo project reference states.
