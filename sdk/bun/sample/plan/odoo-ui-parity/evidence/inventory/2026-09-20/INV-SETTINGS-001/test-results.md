# Test results

Focused results for `INV-SETTINGS-001`:

- `bun test test/inventory_settings.integration.test.ts --timeout 20000` — 4 passed, 0 failed, 21 assertions.
- Full Inventory regression: `bun test ./test/inventory*.integration.test.ts
  --timeout 20000` — 58 passed, 0 failed, 571 assertions across 18 files.
- The focused suite covers page/API binding, defaults, idempotent migration,
  save/row-version/missing guards, runtime 403 permission checks, and restart persistence.
- `bun run audit` — passed (670 pages, 679 routes, 1210 datasources).
- `bun run css:build:inventory` — passed.
- `bunx eslint test/inventory_settings.integration.test.ts` — passed.
- `git diff --check` — passed.

The Odoo action comparison is not represented as a test pass: authenticated
`/odoo/action-445` returned the captured `RPC_ERROR` before rendering the form.
