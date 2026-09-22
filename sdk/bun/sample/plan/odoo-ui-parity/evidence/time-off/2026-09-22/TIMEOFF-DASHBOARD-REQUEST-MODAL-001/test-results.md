# Test results

- Focused: `bun test ./test/time_off_dashboard_request_modal.integration.test.ts --timeout 30000` — **3 passed, 0 failed, 21 assertions**.
- Time Off regression: `bun test ./test/time_off*.integration.test.ts --timeout 30000` — **88 passed, 0 failed, 827 assertions** across 32 files.
- CSS: `bun run css:build:time-off` — **PASS**.
- Frontend: `bun run frontend:build` — **PASS**.
- `git diff --check` — **PASS**.

The focused suite covers source mapping, page/API discovery, active lookup,
durable deterministic creation, migration replay, duplicate/overlap guards,
invalid type/date/duration guards, and the permission declarations.
