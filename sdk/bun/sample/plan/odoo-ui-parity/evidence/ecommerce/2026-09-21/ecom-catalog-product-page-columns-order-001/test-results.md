# Test results

Focused command:

```text
bun test test/ecommerce_product_page_columns_order.integration.test.ts --timeout 30000
2 passed, 0 failed, 24 expect() calls
```

The focused suite covers Odoo source/template comparison, page/API pairing,
YAML validation, migration replay, deterministic options and fixture CRUD,
permission declarations, invalid/foreign/stale guards, Product Detail
projection, replay safety, and DuckDB restart persistence.

Regression command:

```text
bun test test/ecommerce_product_page_columns_order.integration.test.ts test/ecommerce_product_page_image_roundness.integration.test.ts test/ecommerce_product_page_image_spacing.integration.test.ts test/ecommerce_product_page_image_width.integration.test.ts test/ecommerce_product_page_image_layout.integration.test.ts test/ecommerce_product_page_image_ratio.integration.test.ts test/ecommerce_product_detail.integration.test.ts --timeout 30000
17 passed, 0 failed, 179 expect() calls
```

Audit: `bun run audit` passed with 748 pages, 757 routes, and 1493
datasources. Scoped ESLint passed. Commit and diff checks are recorded in the
Ecommerce QA ledger. Local commit: `f88b6af4` (not pushed).
