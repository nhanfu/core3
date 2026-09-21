# `SURVEYS-SUGGESTED-VALUE-CREATE-001` verification

- Focused: `bun test test/surveys_suggested_value_create.integration.test.ts` —
  **3 passed, 22 assertions**.
- Neighboring: create, edit, delete, reorder, question edit, question reorder,
  and Surveys catalog — **41 passed, 367 assertions**.
- Full module: `bun test test/surveys*.ts` — **198 passed, 4 failed, 1,668
  assertions across 67 files**. The four failures are the existing migration
  rollback/dependent-entry error: `Cannot alter entry "survey_questions"
  because there are entries that depend on it.`
- Audit: `bun run audit` — **766 pages, 775 routes, 1,562 datasources**;
  shared-page audit passed.
- Lint: `bunx eslint test/surveys_suggested_value_create.integration.test.ts
  test/surveys.integration.test.ts` — passed. YAML was validated by the
  focused YAML contract test.
- Diff check: `git diff --check` — passed.

Focused coverage includes page/API pairing, migration replay, actor and
permission boundary, missing question, unsupported type, archived/changed
parent, stale question, value/sequence/score validation, request-key replay,
parent/question version advancement, and file-backed restart persistence.
