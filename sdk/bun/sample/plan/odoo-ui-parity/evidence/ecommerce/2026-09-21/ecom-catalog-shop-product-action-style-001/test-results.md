# Test results

- Focused: `bun test ./test/ecommerce_shop_product_action_style.integration.test.ts`
  — **2 passed, 37 assertions, 0 failures**.
- Adjacent Shop regression:
  `bun test ./test/ecommerce_shop_product_action_style.integration.test.ts
  ./test/ecommerce_shop_product_action_placement.integration.test.ts
  ./test/ecommerce_shop_product_cta.integration.test.ts
  ./test/ecommerce_shop_product_descriptions.integration.test.ts
  ./test/ecommerce_shop.integration.test.ts
  ./test/ecommerce_shop_grid_gap.integration.test.ts
  ./test/ecommerce_shop_page_size.integration.test.ts
  ./test/ecommerce_shop_grid_columns.integration.test.ts` — **17 passed,
  243 assertions, 0 failures**.
- Scoped ESLint passed for the focused integration test.
- `bun run audit` passed: **766 pages, 775 routes, 1562 datasources**.
- Scoped `git diff --check` passed.
