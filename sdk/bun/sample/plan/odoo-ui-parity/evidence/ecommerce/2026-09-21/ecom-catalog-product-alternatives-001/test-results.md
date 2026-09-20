# Test results

- `bun test ./test/ecommerce_product_alternatives.integration.test.ts
  --timeout 20000` — **3 passed, 22 assertions, 0 failures**.
- `bun test ./test/ecommerce_product_detail.integration.test.ts
  ./test/ecommerce_product_variants.integration.test.ts --timeout 20000` —
  combined with the alternatives test: **12 passed, 77 assertions, 0
  failures**.
- `bun scripts/audit-order-ui.ts` — **passed**, 692 pages, 701 routes, 1294
  datasources.
- `bunx eslint test/ecommerce_product_alternatives.integration.test.ts` —
  **passed**.
- `git diff --check` — **passed**.
- Full repository regression was not run; unrelated owner scopes remain
  outside this bounded verification.
