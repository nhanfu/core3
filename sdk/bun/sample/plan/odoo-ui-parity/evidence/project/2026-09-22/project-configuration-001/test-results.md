# Test results

- `bun test ./test/project_configuration_action.integration.test.ts --timeout 30000`
  — 4 passed, 0 failed, 29 assertions.
- `bun test ./test/project*.integration.test.ts --timeout 30000` — 67 passed,
  0 failed, 690 assertions across 23 files.
- `bun run audit` — passed: 819 pages, 828 routes, 1,707 datasources.
- `bun run css:build:project` — passed.
- `bun run frontend:build` — passed: 184 modules transformed.
- `git diff --check` — passed.

No browser screenshots are included because the required authenticated Odoo
tab was unavailable to this session.
