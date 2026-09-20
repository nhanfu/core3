# Verification results

All commands were run from `sdk/bun/sample`.

- Focused: `bun test test/ecommerce_product_website_sequence.integration.test.ts`
  — **3 passed, 30 assertions, 0 failures**.
- Bounded regression:
  `bun test test/ecommerce_product_website_sequence.integration.test.ts test/ecommerce_products.integration.test.ts test/ecommerce_product_detail.integration.test.ts test/ecommerce_shop.integration.test.ts --timeout 20000`
  — **13 passed, 105 assertions, 0 failures**.
- Audit: `bun run audit` — **passed**, 718 pages, 727 routes, and 1382
  datasources.
- Scoped lint: `bunx eslint test/ecommerce_product_website_sequence.integration.test.ts`
  — **passed**.
- Diff check: `git diff --check` — **passed** before commit staging.

No full-repository regression was required for this bounded slice.
