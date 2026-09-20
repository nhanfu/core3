# `TIMESHEET-EMPLOYEE-REPORT-PREVIEW`

Captured 2026-09-20 against the authenticated Core3 module runner at
`http://127.0.0.1:4041` and authenticated Odoo `core3_reference` at
`http://127.0.0.1:8069`.

Core3 used `admin@tms.local` / `admin123`, opened the employee Timesheets
action for `employee-demo-002`, clicked Print, and followed the YAML-owned
`/timesheets/employee-report-preview?id=employee-demo-002` route. Desktop and
mobile both persisted the employee report run, rendered Morgan Taylor's
summary and three persisted lines, returned no page/request failures, and
stayed within the viewport (`1440/1440` and `390/390`).

Odoo used `codex@core3.local` / `Core3Odoo2026!` in `core3_reference` and
opened `/odoo/employees/3` at both viewports. The authenticated employee form
shows the employee context, but desktop's Timesheets stat is empty/new-entry
only, mobile hides the stat, and neither viewport exposes a visible Print
report action. This is an exact reference-data/action blocker; no Odoo report
execution parity is claimed.

The machine-readable result is in `results.json`; screenshots are the paired
desktop/mobile Core3 employee route/preview and Odoo employee reference states.
