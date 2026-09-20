# Verification results

- Focused: `bun test test/surveys_public_text_question.integration.test.ts` — **2 passed, 23 assertions**.
- Public/core Surveys regression: `bun test test/surveys_public*.integration.test.ts test/surveys.integration.test.ts` — **81 passed, 756 assertions, 0 failed** across 26 files.
- Scoped ESLint: `bunx eslint public/components/PublicSurvey.ts services/surveys/module.ts test/surveys_public_text_question.integration.test.ts` — pass.
- Audit: `bun run audit` — pass; `718 pages, 727 routes, 1382 datasources`.
- Diff check: `git diff --check` — pass.

The focused lifecycle verifies paired YAML ownership, required/malformed Text
guards before mutation, newline-preserving answer persistence across DuckDB
restart, concurrent same-key submit convergence, response-count integrity, and
wrong-token denial.
