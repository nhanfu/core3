# Test results

- `bun test test/fleet_contracts.integration.test.ts --timeout 20000` — **6
  passed, 69 assertions**.
- `bun test ./test/fleet*.integration.test.ts --timeout 20000` — **75 passed,
  791 assertions** across 22 Fleet files.
- `bun run css:build:fleet` — passed.
- `git diff --check` — passed.
- `bun run audit` — passed: **772 pages, 781 routes, 1,582 datasources**.
  The previously observed CRM discovery failure is resolved by the now-present
  CRM API fragments; no CRM files were changed or staged for this slice.
