# Test results

- `bun test test/expenses_activity_view.integration.test.ts --timeout 20000`
  — 3 passed, 11 assertions.
- `bun test test/*expense*.integration.test.ts --timeout 20000` — 53 passed,
  300 assertions, 0 failed across 15 files.
- `bun run audit` — passed: 807 pages, 816 routes, 1,671 datasources.
- `bun run css:build:expenses` — passed.
- `bun run frontend:build` — passed.
- `git diff --check` — passed.

The new test covers page/API separation, Odoo labels, durable scheduled-row
metadata, search, deterministic empty state, and transport error handling.
