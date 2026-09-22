# Test results

- Focused integration: `bun test test/timesheets_my_billing_type_group.integration.test.ts` — 4 pass, 0 fail, 18 expectations.
- Isolated My Timesheets regression: 31 pass, 0 fail, 194 expectations.
- UI audit: 842 pages, 850 routes, 1755 datasources.
- `bun run frontend:build` — pass.
- `bun run css:build:timesheets` — pass.
- Focused ESLint — pass.
- Timesheets-owned `git diff --check` — pass.

The full `test/timesheets_*.integration.test.ts` glob was also started, but its
detached output handoff did not expose a final aggregate; it is not counted as
a pass claim.
