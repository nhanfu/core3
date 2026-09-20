# Test results

Focused command:

```text
bun test test/surveys_public_datetime_question.integration.test.ts
```

Result: **2 passed, 0 failed, 21 assertions**.

Coverage includes API/page pairing and `surveys.public` permissions, the
deterministic Datetime fixture, impossible timestamp rejection without
mutation, valid persistence, file-backed DuckDB reopen, concurrent same-key
submit convergence to one response row, response-count durability, and
wrong-token rejection.

The adjacent public regression command also passed **38 tests / 311
assertions** across 15 public integration files.

The migration rollback suite remains an adjacent known blocker: DuckDB reports
`Dependency Error: Cannot alter entry "surveys" because there are entries that
depend on it.` This feature does not alter that rollback path.
