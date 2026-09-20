# Test results

Focused command:

```text
bun test test/surveys_public_scale_question.integration.test.ts
```

Result: **2 passed, 0 failed, 20 assertions**.

Coverage includes API/page pairing and `surveys.public` permissions, the
deterministic Scale fixture and 0–10 option range, out-of-range rejection
without mutation, valid persistence, file-backed DuckDB reopen, concurrent
same-key submit convergence to one response row, response-count durability,
and wrong-token rejection.

The adjacent public regression command also passed **40 tests / 331
assertions** across 16 public integration files.

The full repository and migration rollback suites were not rerun in this
bounded wave. The existing DuckDB rollback blocker remains recorded separately.
