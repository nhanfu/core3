# Test results

- `bun test test/surveys_access_settings.integration.test.ts --timeout 20000`:
  **3 passed, 0 failed, 20 assertions**.
- Adjacent scoring and time-limit suites: **6 passed, 0 failed, 46
  assertions**.
- `bunx eslint test/surveys_access_settings.integration.test.ts`: passed.
- `bun run audit`: passed — **807 pages, 816 routes, 1,671 datasources**.
- `git diff --check`: passed.
- `bun run frontend:build`: run successfully before the isolated runtime
  probe.

The known broader Surveys migration rollback/dependent-entry failures remain
outside this focused slice.
