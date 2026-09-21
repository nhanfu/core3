# Surveys public attempt limit — verification

Focused command:

```text
bun test ./test/surveys_public_attempt_limit.integration.test.ts
3 pass / 0 fail / 30 expect() calls
```

The focused lifecycle covers paired page/API metadata and `surveys.public`,
missing identity, normalized respondent email persistence, completed-attempt
exhaustion at start and retry, idempotent concurrent start, and file-backed
restart.

Related public regression:

```text
bun test ./test/surveys_public_attempt_limit.integration.test.ts ./test/surveys_public_retry.integration.test.ts
6 pass / 0 fail / 54 expect() calls
```

Full bounded Surveys regression:

```text
bun test ./test/surveys*.test.ts
128 pass / 4 fail / 1,116 expect() calls across 132 tests
```

The four failures are the existing DuckDB migration rollback/dependent-entry
failures while altering `survey_questions`; no attempt-limit test failed.

Audit:

```text
bun run audit
UI audit: 725 pages, 734 routes, 1407 datasources
UI audit passed
```

Scoped ESLint for the changed TypeScript files and `git diff --check` pass.
