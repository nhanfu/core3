# Test results

Focused command:

```text
bun test test/ecommerce_product_page_image_roundness.integration.test.ts --timeout 30000
2 passed, 0 failed, 26 expect() calls
```

The focused suite covers Odoo source/template comparison, page/API pairing,
YAML validation, migration replay, deterministic options and fixture CRUD,
permission declarations, invalid/foreign/stale guards, Product Detail
projection, replay safety, and DuckDB restart persistence.

Regression command:

```text
bun test test/ecommerce_product_page_image_roundness.integration.test.ts test/ecommerce_product_page_image_spacing.integration.test.ts test/ecommerce_product_page_image_width.integration.test.ts test/ecommerce_product_page_image_layout.integration.test.ts test/ecommerce_product_page_image_ratio.integration.test.ts test/ecommerce_product_detail.integration.test.ts --timeout 30000
15 passed, 0 failed, 155 expect() calls
```

Audit: `bun run audit` passed with 747 pages, 756 routes, and 1490
datasources. Scoped ESLint passed. Commit and diff checks are recorded in the
Ecommerce QA ledger. Local commit: `2cc62edd` (not pushed).
