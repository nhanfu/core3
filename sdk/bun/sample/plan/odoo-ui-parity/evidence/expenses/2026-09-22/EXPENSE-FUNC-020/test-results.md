# EXPENSE-FUNC-020 test results

- `bun test test/expenses_dashboard.integration.test.ts --timeout 20000` — 2
  passed, 10 assertions.
- `bun test test/expenses*.integration.test.ts test/accounting_employee_expenses.integration.test.ts --timeout 20000` — 68 passed, 0 failed, 379 assertions across 20 files.
- `bun run audit` — passed: 865 pages, 873 routes, 1,832 datasources.
- `git diff --check` — passed.
- `bun run css:build:expenses` — unavailable: no such script in the current
  sample package; no CSS build result is claimed.
