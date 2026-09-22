# Test results

- `bun test ./test/ecommerce_delivery_zip_prefixes.integration.test.ts --timeout 30000`
  — **3 passed, 30 assertions, 0 failures**.
- The focused suite covers Odoo source/action comparison, YAML page/API
  binding, technical permission declarations, idempotent migrations, seeded
  list/search/empty/error states, uppercase create/edit, duplicate/blank and
  missing/stale guards, delete, and DuckDB restart persistence.
- `git diff --check` — pass after the owned changes.
- `bun run audit` — pass: 843 pages, 851 routes, 1,761 datasources.
- `bun run css:build:ecommerce` — pass.
- `bun run frontend:build` — pass: Vite production build completed.
- Full eCommerce regression: **246 passed, 8 failed, 2,330 assertions**
  across 254 tests/87 files. The eight failures are unrelated concurrent
  baseline changes (menu-group index assumptions, confirmation-email fixture,
  Product Detail field ordering, reorder index conflict, and variant-page
  component ordering); the new zip-prefix suite passed all 3 tests.
