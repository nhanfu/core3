# Test results

Focused command:

```text
bun test test/surveys_public_date_question.integration.test.ts
```

Result: **2 passed, 0 failed, 21 assertions**.

Coverage includes API/page pairing and `surveys.public` permissions, the
deterministic Date fixture, impossible-date rejection without mutation, valid
ISO answer persistence, file-backed DuckDB reopen, concurrent same-key submit
convergence to one response row, response-count durability, and wrong-token
rejection.

The adjacent migration test was also run. Its four pre-existing DuckDB
rollback/dependent-entry cases remain blocked by:

```text
Dependency Error: Cannot alter entry "surveys" because there are entries that depend on it.
```

This feature does not alter that rollback path.
