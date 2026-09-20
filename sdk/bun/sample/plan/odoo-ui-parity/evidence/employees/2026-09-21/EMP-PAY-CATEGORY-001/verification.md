# Verification

- Focused integration: `bun test test/employees_pay_category.integration.test.ts`
  — 4 tests, 21 assertions.
- Coverage includes Odoo source mapping, page/API `page.id` parity, durable
  employee/current-record update, manager permission, actor/company/stale
  guards, supported-value validation, migration replay, and restart.
- Authenticated Odoo desktop/mobile detail captures completed. Mobile Payroll
  rendered Pay Category; desktop remained on Work during the bounded tab
  interaction. Seven unrelated shell icon 404s are listed in `browser.json`.
- Core3 attempt: `bun dev --db=ddb --memory` served Vite on 3002 and announced
  backend 3001, but `/api/modules` stayed unavailable through the bounded poll;
  the timeout stopped the process and no Core3 UI evidence is claimed.
- UI audit: **718 pages / 727 routes / 1,375 datasources**, passed.
- Scoped ESLint for the new and adjacent Payroll tests, passed.
- Scoped `git diff --check`, passed.

No aggregate Employees sign-off is claimed.
