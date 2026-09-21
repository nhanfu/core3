# Verification results

All commands were run from `sdk/bun/sample`.

- Focused: `bun test test/ecommerce_product_feeds.integration.test.ts
  --timeout 20000` — **3 passed, 40 assertions, 0 failures**.
- Bounded regression:
  `bun test test/ecommerce_product_feeds.integration.test.ts
  test/ecommerce_product_detail.integration.test.ts
  test/ecommerce_shop.integration.test.ts test/ecommerce_categories.integration.test.ts
  test/ecommerce_products.integration.test.ts --timeout 20000` — **15
  passed, 122 assertions, 0 failures**.
- Audit: `bun run audit` — **passed**, 719 pages, 728 routes, and 1391
  datasources.
- Scoped lint: `bunx eslint test/ecommerce_product_feeds.integration.test.ts`
  — **passed**.
- Scoped/staged diff check: `git diff --check` and `git diff --cached --check`
  — **passed** before commit.

No full-repository regression was required for this bounded slice.
