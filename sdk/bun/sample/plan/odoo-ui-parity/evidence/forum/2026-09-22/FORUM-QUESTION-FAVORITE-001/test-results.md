# Test results

- `bun test test/forum_question_favorite.integration.test.ts --timeout 20000`
  — 4 passed, 19 assertions, 0 failures.
- Covered page/API discovery, initial state, two-user counts, toggle reversal,
  stale protection, missing actor, archived guard, HTTP `forum.read` denial,
  detail reload, migration replay, and file-backed restart persistence.
- `git diff --check` is required in the final verification pass.
