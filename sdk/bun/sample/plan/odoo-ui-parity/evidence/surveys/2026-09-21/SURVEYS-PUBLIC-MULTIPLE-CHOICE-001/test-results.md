# Verification results

- Focused: `bun test test/surveys_public_multiple_choice.integration.test.ts`
  — **2 passed, 24 assertions**.
- The focused lifecycle covers page/API contract, permission declarations,
  deterministic fixture discovery, duplicate/foreign no-mutation guards,
  required submission, durable progress, file-backed restart, concurrent
  idempotent submit, response-count integrity, and wrong-token denial.
- Full public/core Surveys regression: **83 passed, 0 failed, 780 assertions**
  across 27 files.
- UI audit: **719 pages, 728 routes, 1391 datasources**; scoped ESLint and
  `git diff --check` passed.
