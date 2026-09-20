# Test results

- Focused: `bun test --max-concurrency 1
  test/surveys_test_entry.integration.test.ts` — **3 passed, 0 failed,
  27 assertions**.
- Full Surveys glob: **66 passed, 0 failed, 535 assertions** across 15
  integration files.
- Scoped ESLint: passed for `test/surveys_test_entry.integration.test.ts`.
- `git diff --check`: passed.
- Repository audit: passed separately; see `verification.md` for the exact
  page/route/datasource totals.
