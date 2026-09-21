# Timesheets Wave 46 verification

- Focused feature test: `bun test
  test/timesheets_portal_task_hours_summary.integration.test.ts --timeout
  20000` — 4 pass, 0 fail, 24 expectations.
- Related portal/task regression: 6 files — 22 pass, 0 fail, 157
  expectations.
- Scoped lint: `bunx eslint` over the Wave 46 test and related portal/task
  tests — exit 0.
- UI audit: `bun scripts/audit-order-ui.ts` — 766 pages, 775 routes, 1,562
  datasources; audit passed.
- Staged exact-path diff check: `git diff --cached --check` — pass after
  staging only Timesheets files.
- Post-commit diff check: pending until the local feature commit is created.
