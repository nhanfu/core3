# Test results

- Focused: `bun test test/maintenance_request_schedule_window.integration.test.ts`
  — 2 passed, 19 assertions.
- Maintenance regression: `bun test ./test/maintenance*.integration.test.ts
  --timeout 30000` — 56 passed, 0 failed, 482 assertions.
- `bun run audit` — passed, 847 pages / 855 routes / 1,778 datasources.
- `bun run frontend:build` — passed.
- `bun run css:build:global && bun run css:build:maintenance` — passed.
- `git diff --check` — passed.
