# Test results

- Focused: `bun test test/surveys_public_comments.integration.test.ts` —
  **2 passed, 21 assertions**.
- Public regression: `bun test test/surveys_public_*.integration.test.ts` —
  **46 passed, 399 assertions, 0 failed**.
- Migration suite: `bun test test/surveys_migrations.integration.test.ts` —
  **0 passed, 4 failed**. DuckDB reports
  `Dependency Error: Cannot alter entry "survey_questions" because there are
  entries that depend on it.` This is the existing rollback/dependent-entry
  gate; the new forward migration is exercised by the focused file-backed
  test.
- Lint: `bunx eslint services/surveys/module.ts
  public/components/PublicSurvey.ts
  test/surveys_public_comments.integration.test.ts
  test/surveys_migrations.integration.test.ts` — passed with no output.
- Audit: `bun run audit` — passed: **710 pages, 719 routes, 1353
  datasources**.
- Scoped `git diff --check` — passed.
