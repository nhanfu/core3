# Verification results

- `bun test test/ecommerce_product_seo_metadata.integration.test.ts --timeout
  20000` — **3 passed, 22 assertions, 0 failures**.
- Adjacent regression:
  `bun test test/ecommerce_product_seo_metadata.integration.test.ts
  test/ecommerce_product_detail.integration.test.ts
  test/ecommerce_products.integration.test.ts
  test/ecommerce_shop.integration.test.ts --timeout 20000` — **13 passed,
  97 assertions, 0 failures**.
- Paired page/API schema validation for Product Detail, Products, Shop, and
  Product Variant Detail — **passed, 4 pairs**.
- `bun scripts/audit-order-ui.ts` — **passed**, 710 pages, 719 routes, 1354
  datasources.
- `bunx eslint test/ecommerce_product_seo_metadata.integration.test.ts` —
  **passed**.
- `git diff --check` — **passed**.
