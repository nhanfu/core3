# Timesheets Wave 45 verification

- Focused feature test: `bun test
  test/timesheets_task_action_portal_views.integration.test.ts --timeout
  20000` — 3 pass, 0 fail, 24 expectations.
- Related regression: 13 task/action/report files — 49 pass, 0 fail, 279
  expectations.
- Scoped lint: `bunx eslint` over the Wave 45 test and related Timesheets
  task/action/report tests — exit 0.
- UI audit: `bun scripts/audit-order-ui.ts` — 764 pages, 773 routes, 1,555
  datasources; audit passed.
- Staged exact-path diff check: `git diff --cached --check` — pass after
  staging only Timesheets files.
- Post-commit diff check: `git diff HEAD^ HEAD --check` — pending until the
  local feature commit is created.
