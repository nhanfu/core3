# Verification results

- `bun test test/ecommerce_product_publication.integration.test.ts --timeout
  20000` — **3 passed, 28 assertions, 0 failures**.
- Adjacent regression:
  `bun test test/ecommerce_product_publication.integration.test.ts
  test/ecommerce_product_detail.integration.test.ts
  test/ecommerce_shop.integration.test.ts --timeout 20000` — **11 passed,
  81 assertions, 0 failures**.
- Paired page/API schema validation for Products, Product Detail, Shop, and
  Product Variant Detail — **passed, 4 pairs**.
- `bun scripts/audit-order-ui.ts` — **passed**, 710 pages, 719 routes, 1353
  datasources.
- `bunx eslint test/ecommerce_product_publication.integration.test.ts` —
  **passed**.
- `git diff --check` — **passed**.
