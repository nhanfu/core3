# Test results

- Focused: `bun test test/time_off_my_allocations_activity.integration.test.ts` — **3 pass, 0 fail, 19 assertions**.
- Affected regression: `bun test test/time_off.integration.test.ts test/time_off_my_allocations_activity.integration.test.ts` — **12 pass, 0 fail, 212 assertions**.
- Full Time Off glob after the affected test setup repair — **66 pass, 0 fail, 669 assertions** across 24 files.
- Frontend: `bun run frontend:build` — **pass**, Vite transformed 184 modules and built successfully.
- CSS: `bun run css:build:time-off` — **pass**.
- `git diff --check` — **pass**.

The focused suite verifies page/API IDs, visible tabs and labels, deterministic
seed order, search/empty state, valid scheduling, invalid type/date, stale
version rejection, migration replay, and file-backed restart persistence.
