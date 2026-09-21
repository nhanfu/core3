# Test results

Focused command:

```text
bun test test/ecommerce_product_page_image_spacing.integration.test.ts --timeout 30000
2 passed, 0 failed, 26 expect() calls
```

The focused suite covers Odoo source/template comparison, page/API pairing,
YAML validation, migration replay, deterministic options and fixture CRUD,
permission declarations, invalid/foreign/stale guards, Product Detail
projection, replay safety, and DuckDB restart persistence.

Regression command:

```text
bun test test/ecommerce_product_page_image_spacing.integration.test.ts test/ecommerce_product_page_image_width.integration.test.ts test/ecommerce_product_page_image_layout.integration.test.ts test/ecommerce_product_page_image_ratio.integration.test.ts test/ecommerce_product_detail.integration.test.ts --timeout 30000
13 passed, 0 failed, 129 expect() calls
```

Audit: `bun run audit` passed with 744 pages, 753 routes, and 1478
datasources. Scoped ESLint passed. Commit and diff checks are recorded in the
Ecommerce QA ledger. Local commit: `cafc7605` (not pushed).
