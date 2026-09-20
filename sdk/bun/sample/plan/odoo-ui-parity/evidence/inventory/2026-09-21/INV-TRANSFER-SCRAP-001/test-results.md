# Verification — INV-TRANSFER-SCRAP-001

- `bun test test/inventory_transfer_scrap.integration.test.ts`: PASS, 4 tests,
  23 assertions.
- `bun run audit`: PASS, 718 pages, 727 routes, 1,379 datasources.
- `bunx eslint test/inventory_transfer_scrap.integration.test.ts`: PASS.
- `git diff --check`: PASS.
- Odoo probe: HTTP 303 `/web` -> `/web/login`; paired Odoo visual/mutation
  evidence is blocked by the unavailable authenticated session.
