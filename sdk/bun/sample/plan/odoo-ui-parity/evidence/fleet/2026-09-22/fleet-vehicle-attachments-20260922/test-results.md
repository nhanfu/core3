# Test results

Commands and results:

- `bun test test/fleet_vehicle_attachments.integration.test.ts --timeout 30000` — **3 passed, 27 assertions**.
- `bun test test/fleet*.integration.test.ts --timeout 20000` — **84 passed, 876 assertions** across 25 files.
- `bun run css:build:fleet` — passed.
- `bun run audit` — passed: **802 pages, 811 routes, 1,656 datasources**.
- `git diff --check` — passed.

The focused suite covers deterministic seed replay, page/API/storage
contracts, company-scoped reads, upload/remove mutations, actor and stale
guards, duplicate/invalid/missing vehicle rejection, and file-backed restart.
