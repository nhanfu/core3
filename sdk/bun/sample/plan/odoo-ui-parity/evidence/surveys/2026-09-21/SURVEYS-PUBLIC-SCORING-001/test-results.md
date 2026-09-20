# Test results

- `bun test test/surveys_public_scoring.integration.test.ts`: **2 passed, 14 assertions**.
- Adjacent public regression command (response, restart, retry, print, deadline,
  answer validation, and scoring): **14 passed, 134 assertions**.
- The scoring test covers YAML page/API identity, public permission contract,
  score/pass calculation, file-backed restart, concurrent idempotent submit,
  and wrong-token rejection.

- Full Surveys glob: **88 passed, 5 failed, 715 assertions**. The four
  migration rollback cases fail on the pre-existing DuckDB dependent-entry
  rollback boundary; the existing authenticated test-entry fixture-count case
  expects one response but observes two. These failures are outside the new
  scoring migration and were not altered in this bounded slice.
- Scoped `bunx eslint services/surveys/module.ts
  test/surveys_public_scoring.integration.test.ts`: passed.
- `bun run audit`: passed (695 pages, 704 routes, 1,310 datasources).
- `git diff --check`: passed.
