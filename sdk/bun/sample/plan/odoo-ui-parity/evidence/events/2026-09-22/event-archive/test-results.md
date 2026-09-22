# Test results

- `bun test ./test/events_archive.integration.test.ts --timeout 20000`
  **PASS** — 2 tests / 26 assertions.
- `bun test ./test/events*.integration.test.ts --timeout 20000`
  **PASS** — 126 tests / 967 assertions across 46 files.

The focused test covers local Odoo source mapping, page/API ownership,
deterministic active and archived queries, archive and restore mutations,
missing/stale/replay guards, migration replay, and persistence after reopening
a file-backed DuckDB database.
