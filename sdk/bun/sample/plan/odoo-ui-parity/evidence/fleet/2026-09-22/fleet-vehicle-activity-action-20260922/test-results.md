# Test results

- Focused: `bun test test/fleet_vehicle_activity_action.integration.test.ts
  --timeout 20000` — 3 passed, 21 assertions.
- Fleet regression: `bun test ./test/*fleet*.integration.test.ts --timeout
  20000` — 95 passed, 0 failed, 959 assertions across 29 files.
- UI audit: `bun run audit` — passed, 834 pages / 842 routes / 1,739
  datasources.
- Fleet Sass: `bun run css:build:fleet` — passed.
- Frontend build: `bun run frontend:build` — passed during this validation
  run; it rebuilt the shared and Fleet CSS before Vite build.
- Formatting: `git diff --check` — passed.

The initial full Fleet run failed only because the existing visual-contract
assertion expected the old two-mode list. Updating that module-local regression
assertion and rerunning produced the pass recorded above.
