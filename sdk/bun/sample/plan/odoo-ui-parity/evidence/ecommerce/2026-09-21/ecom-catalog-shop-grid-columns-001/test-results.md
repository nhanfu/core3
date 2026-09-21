# Test results

Focused command:

```text
bun test test/ecommerce_shop_grid_columns.integration.test.ts --timeout 30000
2 passed, 0 failed, 26 expect() calls
```

The focused suite covers Odoo model/builder comparison, page/API pairing, YAML
validation, migration replay, deterministic options and fixture CRUD, missing
record behavior, permission declarations, invalid/foreign/stale guards, Shop
projection, and DuckDB restart persistence.

Regression command:

```text
bun test test/ecommerce_shop_grid_columns.integration.test.ts test/ecommerce_shop_page_container.integration.test.ts test/ecommerce_shop_default_sort.integration.test.ts test/ecommerce_shop.integration.test.ts --timeout 30000
10 passed, 0 failed, 104 expect() calls
```

Audit: `bun run audit` passed with 753 pages, 762 routes, and 1519
datasources. Scoped ESLint and `git diff --check` passed. The local commit is
recorded in the final handoff (not pushed).
