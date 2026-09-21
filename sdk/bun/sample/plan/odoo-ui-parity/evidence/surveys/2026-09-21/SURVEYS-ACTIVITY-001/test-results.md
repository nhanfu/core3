# SURVEYS-ACTIVITY-001 verification

- Focused integration: `bun test test/surveys_activity.integration.test.ts` — **3 passed, 18 assertions**.
- Adjacent regression: `bun test test/surveys.integration.test.ts test/surveys_activity.integration.test.ts test/surveys_responsible_user.integration.test.ts` — **29 passed, 255 assertions**.
- Covered contracts: page/API join, schedule/complete permission and actor guards, invalid type/date/summary guards, parent/activity optimistic concurrency, deterministic replay rejection, and file-backed DuckDB restart.
- Full repository regression was not run.
- `git diff --check` passed before commit.
