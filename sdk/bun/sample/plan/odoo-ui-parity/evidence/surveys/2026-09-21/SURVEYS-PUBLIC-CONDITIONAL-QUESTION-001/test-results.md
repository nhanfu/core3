# Test results

- Focused: `bun test test/surveys_public_conditional_question.integration.test.ts`
  — **2 passed, 25 assertions** after the renderer binding assertion was
  added.
- Public regression: `bun test test/surveys_public_*.integration.test.ts` —
  **44 passed, 376 assertions, 0 failed**.
- Module regression attempt: `bun test test/surveys*.integration.test.ts` ran
  the Surveys suites but cannot complete cleanly because the existing four
  migration rollback cases fail on DuckDB dependent entries; the passing
  suites include the new conditional workflow and the complete public glob.
- Migration-specific: `bun test test/surveys_migrations.integration.test.ts`
  — **0 passed, 4 failed**, each with `Dependency Error: Cannot alter entry
  "surveys" because there are entries that depend on it.` This is the known
  rollback/dependent-entry blocker, not a conditional-question assertion.
- Lint: `bunx eslint services/surveys/module.ts
  public/components/PublicSurvey.ts
  test/surveys_public_conditional_question.integration.test.ts
  test/surveys_migrations.integration.test.ts` — passed with no output.
- Audit: `bun run audit` — blocked by a concurrent non-Surveys page schema
  error: `components[0].views[1].group_by is required for kanban`,
  `components[0].search.names is not allowed`, and
  `components[0].search.templates... is not allowed`.
- Scoped diff check: `git diff --check` — passed after the final edits.
