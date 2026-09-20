# Test results

- `bun test ./test/ecommerce_product_variant_images.integration.test.ts
  --timeout 20000` — **3 passed, 33 assertions, 0 failures**.
- Adjacent Ecommerce tests (`ecommerce_product_variants`,
  `ecommerce_product_detail`, and `ecommerce_cart`) — **11 passed, 71
  assertions, 0 failures**.
- Combined bounded set: **14 passed, 104 assertions, 0 failures**.
- `bun scripts/audit-order-ui.ts` — **passed**, 697 pages, 706 routes, 1317
  datasources.
- `bunx eslint test/ecommerce_product_variant_images.integration.test.ts` —
  **passed**.
- `git diff --check` — **passed**.
- Full repository regression was not run; unrelated owner scopes remain outside
  this bounded verification.
