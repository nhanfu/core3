# Test results

- `bun test ./test/ecommerce_product_compare_price.integration.test.ts
  --timeout 20000` — **3 passed, 33 assertions, 0 failures**.
- Adjacent Ecommerce tests:
  `ecommerce_products`, `ecommerce_product_detail`,
  `ecommerce_product_variants`, `ecommerce_shop`, and `ecommerce_cart` — **16
  passed, 118 assertions, 0 failures**; combined bounded set **19 passed, 151
  assertions, 0 failures**.
- `bun scripts/audit-order-ui.ts` — **passed**, 701 pages, 710 routes, 1328
  datasources.
- `bunx eslint test/ecommerce_product_compare_price.integration.test.ts` and
  `git diff --check` — **passed**.
- Full repository regression was not run; unrelated owner scopes remain
  outside this bounded verification.
