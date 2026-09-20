# EMP-BANK-TRUST-001 evidence inventory

Feature: Personal bank-account trust toggle (`action_toggle_primary_bank_account_trust`).

QA inventory before capture:

- Core3 authenticated desktop/mobile employee detail and Personal bank-account
  row action, including actor/company/concurrency boundaries and visible trust
  state where deterministic fixtures are in scope.
- Odoo authenticated desktop/mobile Abigail Peterson Personal tab and the
  source bank-account trust surface, including populated row availability,
  browser/request errors, and viewport fit.
- Focused contract checks: page/API separation, source action mapping,
  employees.write permission, durable trusted state, migration replay, and
  file-backed restart.

Expected evidence files:

- `core3-browser.json`, `core3-browser-desktop.json`,
  `core3-browser-mobile.json`, `core3-desktop.png`, `core3-mobile.png`
- `odoo-browser.json`, `odoo-browser-desktop.json`,
  `odoo-browser-mobile.json`, `odoo-desktop.png`, `odoo-mobile.png`
- `source-comparison.md`, `verification.md`

This is bounded feature evidence only; it does not sign off the Employees
module. The exact Core3 schema and Odoo fixture blockers are recorded.
