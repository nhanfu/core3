# Test results

Focused command:

```text
bun test test/events_template_tickets.integration.test.ts --timeout 20000
```

Result after the final assertion correction: 2 tests, 0 failures, 22
assertions. Assertions cover page/API discovery, stable seed ordering,
empty/missing reads, migration replay, restart persistence, create/update/
delete, duplicate/required/seat validation, and stale-row boundaries.

Events regression: `bun test ./test/events*.integration.test.ts --timeout
20000` — 107 tests, 0 failures, 790 assertions. UI audit: 814 pages, 823
routes, and 1,698 datasources. `bun run css:build:events`, `bun run
frontend:build`, targeted ESLint, and `git diff --check` passed.
