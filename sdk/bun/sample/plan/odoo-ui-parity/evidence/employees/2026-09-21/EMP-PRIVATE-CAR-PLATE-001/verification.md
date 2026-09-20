# Verification

- Focused integration: `bun test test/employees_private_car_plate.integration.test.ts`
  — 4 tests, 21 assertions.
- Coverage includes source mapping, page/API `page.id` parity, create/read/edit,
  list projection/search contract, permission declarations, stale and
  wrong-company atomicity, migration replay, and file-backed restart.
- Odoo authenticated desktop/mobile captures completed at the Employees list;
  seven unrelated app-icon 404s are recorded in `browser.json`.
- Core3 bounded attempt: `bun dev --db=ddb --memory` served Vite on 3002 and
  announced the backend on 3001, but `/api/modules` never returned during the
  bounded poll; the timeout stopped the process and no Core3 screenshot is
  claimed.
- UI audit: **716 pages / 725 routes / 1,370 datasources**, passed.
- Scoped ESLint: `bunx eslint test/employees_private_car_plate.integration.test.ts`,
  passed.
- Scoped `git diff --check`, passed.

No aggregate Employees sign-off is claimed.
