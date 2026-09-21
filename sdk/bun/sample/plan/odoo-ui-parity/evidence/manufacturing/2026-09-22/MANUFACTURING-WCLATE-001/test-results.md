# Test results

Passed:

- `bun test test/manufacturing_work_center_late.integration.test.ts`: 4 tests,
  29 assertions.
- Regression suite for Work Center Overview, Late, Waiting Availability, Work
  Center Work Orders, and BoM Operations Performance: 19 tests passed; the
  individually rerun Work Center Work Orders suite passed 4 tests / 24
  assertions.
- `bun run css:build:manufacturing`: passed.
- `bun run audit`: passed, 805 pages / 814 routes / 1,664 datasources.
- Targeted ESLint for the new test: passed.
- `git diff --check`: passed.
