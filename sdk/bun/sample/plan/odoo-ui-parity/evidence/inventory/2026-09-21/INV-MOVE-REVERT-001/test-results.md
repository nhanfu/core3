# Verification — INV-MOVE-REVERT-001

- `bun test test/inventory_move_revert.integration.test.ts`: PASS, 4 tests,
  24 assertions.
- `bun run audit`: PASS, 718 pages, 727 routes, 1,382 datasources.
- `bunx eslint test/inventory_move_revert.integration.test.ts`: PASS.
- `git diff --check`: PASS.
- Odoo probe: HTTP 303 `/web` -> `/web/login`; paired Odoo visual/mutation
  evidence is blocked by the unavailable authenticated session.
