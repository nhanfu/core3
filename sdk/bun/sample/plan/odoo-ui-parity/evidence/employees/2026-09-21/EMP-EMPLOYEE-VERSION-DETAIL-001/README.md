# EMP-EMPLOYEE-VERSION-DETAIL-001 evidence inventory

Feature: clickable Employee Records / `hr.version` snapshot detail.

QA inventory before capture:

- Core3 authenticated desktop and mobile Employee Records list and version
  detail states, including current/future/archived fixture values, company
  scope, navigation back to the employee, browser/request errors, and viewport
  fit.
- Odoo authenticated desktop and mobile Employee Records list and the
  source-backed row-open employee history state, including action/title,
  visible snapshot context, and browser/request errors.
- Focused contract checks: page/API separation, source action mapping,
  employees.read permission, company/missing boundaries, durable migration
  replay, and file-backed restart.

Expected evidence files:

- `core3-browser.json`, `core3-desktop.png`, `core3-mobile.png`
- `odoo-browser.json`, `odoo-desktop.png`, `odoo-mobile.png`
- `verification.md`

This is bounded feature evidence only; it does not sign off the Employees
module. Fixture and reference-data boundaries are recorded explicitly.
