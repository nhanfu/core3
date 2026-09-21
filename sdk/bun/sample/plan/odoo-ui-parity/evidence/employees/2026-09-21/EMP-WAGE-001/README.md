# EMP-WAGE-001 evidence

This bounded slice covers the active Payroll Wage field. Authenticated Odoo
desktop/mobile captures show the Payroll tab and Wage control. Core3 browser
startup was attempted but stopped at an unrelated global page-schema error
before the backend bound; the exact blocker is recorded in `verification.md`.

Artifacts:

- `odoo-desktop.png`, `odoo-mobile.png`: authenticated Odoo employee 1 at
  `/odoo/employees/1`, Payroll tab selected.
- `desktop.json`, `mobile.json`: Odoo viewport observations.
- `core3-blocker.json`: bounded Core3 startup/browser blocker.
- `source-comparison.md`: source-to-contract mapping.
- `verification.md`: focused tests, audit/runtime status, and blockers.

No aggregate Employees sign-off is claimed.
