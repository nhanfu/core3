# Test results

- `bun test test/inventory_product_lots.integration.test.ts --timeout 30000`:
  3 tests, 25 assertions passed.
- Coverage includes page/API separation, both product-form actions,
  template/variant filtering, detail counts, stable empty/503 states,
  company scope, idempotent migration, and file-backed restart persistence.
- `bun run audit`: passed with 842 pages, 850 routes, and 1,755 datasources.
- Full frontend build and `bun run css:build:inventory` passed; no unrelated
  files were changed for this feature.
