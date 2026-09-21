# Test results

- Focused: `bun test test/ecommerce_product_extra_fields.integration.test.ts
  --timeout 30000` — **2 passed, 35 assertions, 0 failures**.
- Adjacent regression:
  `bun test test/ecommerce_product_extra_fields.integration.test.ts
  test/ecommerce_product_detail.integration.test.ts
  test/ecommerce_products.integration.test.ts
  test/ecommerce_shop.integration.test.ts --timeout 30000` — **12 passed,
  110 assertions, 0 failures**.
- Repository UI audit: `bun run audit` — **756 pages, 765 routes, 1534
  datasources; passed**.
- Scoped ESLint: `bunx eslint test/ecommerce_product_extra_fields.integration.test.ts` — passed.
- `git diff --check`: passed for the current Ecommerce/plan changes.
