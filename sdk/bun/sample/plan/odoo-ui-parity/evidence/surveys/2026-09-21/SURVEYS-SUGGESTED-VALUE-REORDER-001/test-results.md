# SURVEYS-SUGGESTED-VALUE-REORDER-001 test results

- Focused: `bun test test/surveys_suggested_value_reorder.integration.test.ts`
  — **3 passed, 0 failed, 27 assertions**.
- Adjacent: seven bounded Surveys files covering question create/edit/
  duplicate/reorder and suggested-value edit/reorder/delete — **21 passed,
  0 failed, 161 assertions**.
- Broader module: `bun test test/surveys.integration.test.ts` — **23 passed,
  0 failed, 220 assertions**.
- Audit: `bun run audit` — passed, **760 pages, 769 routes, 1,548 datasources**.
- Lint: scoped `bunx eslint test/surveys_suggested_value_reorder.integration.test.ts`
  — passed.
- Diff: `git diff --check` — passed.
