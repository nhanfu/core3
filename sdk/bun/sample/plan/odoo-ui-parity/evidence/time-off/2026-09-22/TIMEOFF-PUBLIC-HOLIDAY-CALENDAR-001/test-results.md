# Test results

- Focused: `bun test ./test/time_off_public_holidays.integration.test.ts --timeout 30000`
- Result: **3 passed, 0 failed, 48 assertions**.
- Covered: page/API separation, manager permission, Calendar/List contract,
  schedule scope, date/search/empty/503 queries, CRUD guards, stale rows, and
  idempotent existing-data migration behavior.
- `git diff --check`: passed before final staging.
