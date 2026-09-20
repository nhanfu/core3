# EMP-BANK-ALLOCATION-001 evidence inventory

Feature: Employee Personal bank-account salary allocation wizard.

QA inventory before capture:

- Core3 authenticated desktop/mobile employee-detail navigation to the
  allocation page, allocation summary, line editing, exact-100% status, and
  actor/company/concurrency behavior.
- Odoo authenticated desktop/mobile Abigail Peterson Personal tab and the
  source `Bank Account Allocation` action, including populated-row availability,
  browser/request errors, and viewport fit.
- Focused contract checks: source mapping, page/API separation, durable line
  persistence, exact-total save validation, permission/scope guards, migration
  replay, and file-backed restart.

Expected evidence files:

- `core3-browser.json`, `core3-browser-desktop.json`,
  `core3-browser-mobile.json`, `core3-desktop.png`, `core3-mobile.png`
- `odoo-browser.json`, `odoo-browser-desktop.json`,
  `odoo-browser-mobile.json`, `odoo-desktop.png`, `odoo-mobile.png`
- `source-comparison.md`, `verification.md`

This is bounded feature evidence only; it does not sign off the Employees
module. Fixture and reference-data boundaries are explicit.
