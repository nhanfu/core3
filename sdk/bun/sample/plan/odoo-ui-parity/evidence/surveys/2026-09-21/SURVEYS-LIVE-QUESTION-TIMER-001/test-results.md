# Test results

- Focused timer integration: **2 passed / 22 assertions**.
- Focused related live-answer contract: **2 passed / 23 assertions**.
- Focused test-entry regression after repairing its stale fixture count:
  **3 passed / 27 assertions**.
- Surveys glob (`test/surveys*.integration.test.ts`): **120 passed / 4
  failed / 1041 assertions**. The four failures are the known DuckDB
  rollback/dependent-entry limitation in `surveys_migrations.integration.test.ts`;
  all timer, live-answer, and test-entry checks pass.

The bounded timer test itself is green after a DuckDB-safe migration fix.
