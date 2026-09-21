# Test results

- `bun test test/employees_team_department_filters.integration.test.ts`
  - 3 tests passed
  - 19 assertions passed
  - source mapping, team/department results, foreign-company/unknown-actor
    empties, migration replay, index presence, and file-backed restart
- Regression command: `bun test test/employees_team_department_filters.integration.test.ts test/employees_newly_hired.integration.test.ts test/employees_new_contract.integration.test.ts`
  - 10 tests passed
  - 60 assertions passed
- `bun run audit` passed: 797 pages, 806 routes, and 1,644 datasources.
- `bun x eslint sample/test/employees_team_department_filters.integration.test.ts`
  passed from `sdk/bun`.
- `git diff --check` passed.
- The test uses a real DuckDB repository and the service migration directory;
  it does not use page-local fixtures or a browser bypass.
- Static audit, lint, and diff-check results are recorded in the final
  verification after the focused implementation run.
