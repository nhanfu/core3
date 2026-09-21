# Test results

- Focused: `bun test ./test/ecommerce_shop_product_cta.integration.test.ts`
  — **2 passed, 34 assertions, 0 failures**.
- Adjacent Shop regression:
  `bun test ./test/ecommerce_shop_product_cta.integration.test.ts
  ./test/ecommerce_shop_product_descriptions.integration.test.ts
  ./test/ecommerce_shop.integration.test.ts
  ./test/ecommerce_shop_grid_gap.integration.test.ts
  ./test/ecommerce_shop_page_size.integration.test.ts
  ./test/ecommerce_shop_grid_columns.integration.test.ts` — **13 passed,
  170 assertions, 0 failures**.
- `bunx eslint test/ecommerce_shop_product_cta.integration.test.ts` — passed.
- `bun run audit` — passed at **760 pages, 769 routes, and 1548
  datasources**.
- `git diff --check` — passed for the Ecommerce-owned implementation,
  test, plan, QA, and evidence paths.
