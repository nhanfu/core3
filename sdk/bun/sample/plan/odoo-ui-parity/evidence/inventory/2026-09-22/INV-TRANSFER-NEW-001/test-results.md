# Test results

- `bun test test/inventory_transfer_new.integration.test.ts --timeout 20000`
  — PASS, 4 tests, 23 assertions.
- `bun run css:build:inventory` — PASS.
- Inventory-only route discovery — PASS, 70 routes; `/inventory/transfer/new`
  resolves to page `transfer-new`.
- `git diff --check` — PASS after the evidence changes.
- `bun run audit` — BLOCKED before completion by unrelated global page-schema
  errors: graph view requires `category_field`; activity view requires
  `title_field` and non-empty `activity_types`.

An existing adjacent Inventory baseline test also reports a fixture mismatch
(expected ready count 13, received 19); it was not changed as part of this
feature.
