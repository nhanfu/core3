# INV-WAREHOUSE-ROUTES-001 verification

- `bun test test/inventory_warehouse_routes.integration.test.ts` — 2 tests,
  16 assertions passed.
- Regression command `bun test
  test/inventory_warehouse_routes.integration.test.ts
  test/inventory_routes.integration.test.ts
  test/inventory_warehouses.integration.test.ts
  test/website_page_detail_publish.integration.test.ts` — 12 tests, 120
  assertions passed.
- The focused test verifies Odoo source references, page/API separation,
  manager permission, stable action params, route discovery, direct and
  rule-linked warehouse filtering, company/empty boundaries, and the detail
  route count.
- `bun run audit` — passed: 850 pages, 858 routes, 1,788 datasources.
- `bun run css:build:inventory` — passed.
- `bun run frontend:build` — passed.
- `git diff --check` — passed.
