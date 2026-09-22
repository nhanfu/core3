# Verification

- Focused slice: `bun test test/inventory_product_storage_capacity.integration.test.ts --timeout 30000`
  — 4 tests / 30 assertions passed.
- Adjacent regression set: `inventory_product_storage_capacity`,
  `inventory_storage_categories`, `inventory_product_move_history`,
  `inventory_product_lots`, and `inventory_product_putaway` — 17 tests / 130
  assertions passed.
- UI audit: `bun run audit` — 854 pages, 862 routes, 1,806 datasources passed.
- Inventory Sass: `bun run css:build:inventory` passed.
- `git diff --check` passed before final evidence update.
