# Test results

- `bun test test/fleet_contract_activities.integration.test.ts --timeout 20000` — **3 passed, 31 assertions**.
- Affected Fleet regression set — **21 passed, 242 assertions**.
- `bun test test/fleet*.integration.test.ts --timeout 20000` — **78 passed, 822 assertions** across 23 Fleet files.
- `bun run audit` — passed: **782 pages, 791 routes, 1,606 datasources**.
- `bun run css:build:fleet` — passed.
- `git diff --check` — passed.

The focused test covers source mapping, page/API separation, deterministic
fixtures, empty/error states, schedule/complete workflow, actor/company/stale
guards, and file-backed restart/migration replay.
