# Test results

- `bun test ./test/ecommerce_variant_base_units.integration.test.ts --timeout
  20000` — **3 passed, 27 assertions, 0 failures**.
- Adjacent Ecommerce tests (`ecommerce_product_variants`,
  `ecommerce_product_detail`, and `ecommerce_cart`) — **11 passed, 71
  assertions, 0 failures**.
- Combined bounded set: **14 passed, 98 assertions, 0 failures**.
- `bun scripts/audit-order-ui.ts` — **passed**, 699 pages, 708 routes, 1321
  datasources.
- `bunx eslint test/ecommerce_variant_base_units.integration.test.ts` —
  **passed**.
- `git diff --check` — **passed**.
- Full repository regression was not run; unrelated owner scopes remain outside
  this bounded verification.
