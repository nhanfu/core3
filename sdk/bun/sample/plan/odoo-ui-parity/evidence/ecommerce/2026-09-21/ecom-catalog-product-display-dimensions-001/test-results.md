# Test and static verification results

- Focused feature: `bun test sample/test/ecommerce_product_display_dimensions.integration.test.ts`
  — **3 passed, 31 assertions, 0 failures**.
- Focused regression: the feature test plus
  `ecommerce_product_detail.integration.test.ts`,
  `ecommerce_shop.integration.test.ts`, and
  `ecommerce_products.integration.test.ts` — **13 passed, 112 assertions,
  0 failures**.
- UI audit: `bun run audit` — **718 pages, 727 routes, 1375 datasources**;
  passed.
- Scoped lint: `bunx eslint
  test/ecommerce_product_display_dimensions.integration.test.ts` — passed.
- Diff check: `git diff --check` — passed before staging.
