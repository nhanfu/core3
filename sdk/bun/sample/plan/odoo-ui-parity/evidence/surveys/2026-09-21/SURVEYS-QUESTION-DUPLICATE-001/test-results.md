# Surveys question duplication — verification

Focused command:

```text
bun test ./test/surveys_question_duplicate.integration.test.ts
3 pass / 0 fail / 21 expect() calls
```

Coverage:

- paired page/API contract and `surveys.write` boundary;
- durable question plus suggested-value copy with missing, archived, stale,
  and duplicate-id guards;
- parent survey optimistic version increment;
- file-backed DuckDB reopen and replay rejection without a second question row.

Bounded Surveys regression:

```text
bun test ./test/surveys*.test.ts
```

The final run reached **125 pass / 4 fail / 1,086 assertions** across 129
tests. The four failures are pre-existing DuckDB migration rollback tests that
report dependent-entry errors while altering `survey_questions`. The new
duplicate tests and all catalog/delete/invite page-schema tests pass; no
failure outside this question-detail slice was modified.

Audit after the action-ID correction:

```text
bun run audit
UI audit: 723 pages, 732 routes, 1402 datasources
UI audit passed
```

Scoped lint and diff checks are reported with the commit verification.
