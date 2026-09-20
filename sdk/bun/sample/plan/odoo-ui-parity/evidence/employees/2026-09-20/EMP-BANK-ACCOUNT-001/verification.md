# Verification

- Focused integration: bun test test/employees_bank_accounts.integration.test.ts
  — 4 passed, 32 assertions.
- UI audit: 679 pages, 688 routes, 1,247 datasources; passed.
- Authenticated browser evidence: core3-browser.json, odoo-browser.json,
  and odoo-detail-browser.json, with desktop/mobile PNG captures.
- Core3 blocker: authenticated company Core3 Vietnam Branch does not match
  fixture company Core3 Vietnam.
- Odoo blocker: authenticated reference has 24 employees and all have empty
  bank_account_ids, so no populated allocation state exists to compare.
