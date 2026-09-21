# Test results

Focused command:

```text
bun test test/ecommerce_shop_page_container.integration.test.ts --timeout 30000
2 passed, 0 failed, 24 expect() calls
```

The focused suite covers Odoo source/template comparison, page/API pairing,
YAML validation, migration replay, deterministic options and fixture CRUD,
permission declarations, invalid/foreign/stale guards, Shop projection,
replay safety, idempotency, and DuckDB restart persistence.

Regression command:

```text
bun test test/ecommerce_shop_page_container.integration.test.ts test/ecommerce_product_page_container.integration.test.ts test/ecommerce_product_page_columns_order.integration.test.ts test/ecommerce_product_page_image_roundness.integration.test.ts test/ecommerce_product_page_image_spacing.integration.test.ts test/ecommerce_product_page_image_width.integration.test.ts test/ecommerce_product_page_image_layout.integration.test.ts test/ecommerce_product_page_image_ratio.integration.test.ts test/ecommerce_product_detail.integration.test.ts test/ecommerce_shop.integration.test.ts --timeout 30000
24 passed, 0 failed, 253 expect() calls
```

Scoped ESLint and `git diff --check` passed. `bun run audit` is blocked by an
unrelated unstaged Employees page action: `actions[11].title` and
`actions[11].fields` are not allowed. No non-Ecommerce file was changed to
repair that boundary.

Local implementation commit: recorded in the final handoff (not pushed).
