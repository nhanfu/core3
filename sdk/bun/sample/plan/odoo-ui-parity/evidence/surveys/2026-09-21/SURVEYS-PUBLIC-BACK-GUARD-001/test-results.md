# `SURVEYS-PUBLIC-BACK-GUARD-001` verification

- Focused feature plus prior Previous workflow: `bun test ./test/surveys_public_back_guard.integration.test.ts ./test/surveys_public_previous_question.integration.test.ts` — **6 passed, 0 failed, 41 assertions**.
- Public/catalog regression: `bun test ./test/surveys_public*.test.ts ./test/surveys.integration.test.ts` — **91 passed, 0 failed, 857 assertions** across 30 files.
- Full Surveys glob: `bun test ./test/surveys*.test.ts` — **131 passed, 4 failed, 1,139 assertions** across 135 tests. The four failures are the existing DuckDB migration rollback/dependent-entry errors in `surveys_migrations.integration.test.ts`; no Wave 23 test failed.
- UI audit: **726 pages, 735 routes, 1,409 datasources**, passed.
- Scoped ESLint: passed for the changed Surveys module, renderer, and tests.
- `git diff --check`: passed.

The focused workflow covers disabled direct Previous with no mutation,
file-backed restart, durable setting change, concurrent allowed Previous with
same-key replay, wrong token, stale cursor, and the page/API source contract.
