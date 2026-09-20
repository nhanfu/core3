# EMP-ATTENDANCE-PIN-001 evidence

This bounded slice compares Odoo's authenticated employee Settings field
`PIN Code` under `Attendance/Point of Sale` with the Core3 employee-detail
Settings group and dedicated edit action.

## Captures

- `core3-desktop.png` and `core3-mobile.png`: authenticated Core3
  `admin@tms.local` at 1440x900 and 390x844 on the isolated Employees server.
- `odoo-desktop.png` and `odoo-mobile.png`: authenticated Odoo
  `codex@core3.local` in `core3_owned` at the same viewports, employee
  Abigail Peterson (`/odoo/employees/6`).
- `browser.json`: QA inventory, authentication, visible-control assertions,
  viewport checks, and captured runtime errors.

Both surfaces rendered the Settings tab and PIN Code label with no page errors,
failed requests, HTTP errors, or horizontal overflow. Core3's deterministic
PIN fixtures belong to `Core3 Vietnam`, while the authenticated Core3 session
is `Core3 Demo Company`; the employee projection is therefore empty for the
captured session and no PIN value is claimed. Odoo's reference employee also
has no populated PIN, so the comparison proves the source control but not a
non-empty reference value.

This is authenticated feature evidence only. It does not claim aggregate
Employees parity sign-off.
