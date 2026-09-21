# Test results

All commands ran from `sdk/bun/sample` unless noted.

- `bun test ./test/ecommerce_product_compare_price_visibility.integration.test.ts --timeout 30000`
  — **2 passed, 33 assertions, 0 failures**.
- `bun test ./test/ecommerce_product_compare_price.integration.test.ts --timeout 30000`
  — **3 passed, 0 failures**.
- `bun test ./test/ecommerce_product_reference_price_visibility.integration.test.ts --timeout 30000`
  — **2 passed, 0 failures**.
- `bun test ./test/ecommerce_product_detail.integration.test.ts --timeout 30000`
  — **5 passed, 28 assertions, 0 failures**.
- `bun test ./test/ecommerce_product_page_grid_columns.integration.test.ts --timeout 30000`
  — **2 passed, 30 assertions, 0 failures**.
- `bun test ./test/ecommerce_shop_product_action_style.integration.test.ts --timeout 30000`
  — **2 passed, 37 assertions, 0 failures**.
- `bun run audit` — **786 pages, 795 routes, 1620 datasources; passed**.
- `bunx eslint sample/test/ecommerce_product_compare_price_visibility.integration.test.ts sample/test/ecommerce_product_compare_price.integration.test.ts sample/services/ecommerce/module.ts`
  — passed with no output.
- `git diff --check` — passed.
