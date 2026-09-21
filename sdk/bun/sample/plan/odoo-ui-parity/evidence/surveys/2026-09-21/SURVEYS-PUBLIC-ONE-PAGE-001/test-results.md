# SURVEYS-PUBLIC-ONE-PAGE-001 verification

- Focused integration: `bun test ./test/surveys_public_one_page.integration.test.ts --timeout 30000`
  — **3 passed, 0 failed, 21 assertions**.
- Coverage includes paired page/API contract, deterministic one-page fixture,
  required-answer no-mutation, token-scoped start, progress persistence,
  file-backed DuckDB restart, and concurrent idempotent submit with one
  durable response and response count.
- Public/catalog regression: `bun test ./test/surveys_public*.integration.test.ts ./test/surveys.integration.test.ts --timeout 30000`
  — **97 passed, 0 failed, 903 assertions** across 32 files.
- UI audit: **729 pages, 738 routes, 1,419 datasources**; scoped ESLint passed.
- `git diff --check` is run on the staged Surveys-owned patch before commit.
