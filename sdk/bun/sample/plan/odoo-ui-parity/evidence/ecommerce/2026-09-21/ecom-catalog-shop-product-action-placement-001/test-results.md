# Test results

- Focused: `bun test ./test/ecommerce_shop_product_action_placement.integration.test.ts`
  — **2 passed, 36 assertions, 0 failures**.
- Adjacent Shop regression:
  `bun test ./test/ecommerce_shop_product_action_placement.integration.test.ts
  ./test/ecommerce_shop_product_cta.integration.test.ts
  ./test/ecommerce_shop_product_descriptions.integration.test.ts
  ./test/ecommerce_shop.integration.test.ts
  ./test/ecommerce_shop_grid_gap.integration.test.ts
  ./test/ecommerce_shop_page_size.integration.test.ts
  ./test/ecommerce_shop_grid_columns.integration.test.ts` — **15 passed,
  206 assertions, 0 failures**.
- `bunx eslint test/ecommerce_shop_product_action_placement.integration.test.ts`
  — passed.
- `bun run audit` — blocked before Ecommerce discovery by unrelated Timesheets
  page references `portal_task_timesheet_detail` and
  `back_to_portal_task_timesheets`; no non-Ecommerce file was changed.
- `git diff --check` — passed for the Ecommerce-owned implementation, test,
  plan, QA, and evidence paths.
