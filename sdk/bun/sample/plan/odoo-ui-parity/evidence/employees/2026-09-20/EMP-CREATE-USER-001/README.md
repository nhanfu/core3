# EMP-CREATE-USER-001 evidence inventory

Feature: ERP-manager-only employee-form Create User workflow.

QA inventory before capture:

- Core3 authenticated desktop and mobile employee detail states: employee
  context, Create User visibility or the exact company/fixture boundary, and
  browser/request errors.
- Odoo authenticated desktop and mobile employee detail states: Create User
  action/modal visibility, default Name/Login/Phone fields, and browser/request
  errors.
- Focused contract checks: deterministic invited-user persistence, employee
  link, permission/company/login/stale guards, migration replay, and restart.

Expected evidence files:

- `core3-browser.json`, `core3-desktop.png`, `core3-mobile.png`
- `odoo-browser.json`, `odoo-desktop.png`, `odoo-mobile.png`
- `verification.md`

This is bounded feature evidence only; it does not sign off the Employees
module. Fixture and reference-data boundaries are recorded explicitly.
