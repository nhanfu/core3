# Test results

- Focused: `bun test test/ecommerce_product_page_grid_columns.integration.test.ts
  --timeout 30000` — **2 passed, 30 assertions, 0 failures**.
- Adjacent regression:
  `bun test test/ecommerce_product_page_grid_columns.integration.test.ts
  test/ecommerce_product_extra_fields.integration.test.ts
  test/ecommerce_product_detail.integration.test.ts
  test/ecommerce_product_page_image_layout.integration.test.ts
  test/ecommerce_product_page_image_spacing.integration.test.ts
  test/ecommerce_product_page_columns_order.integration.test.ts
  test/ecommerce_product_page_container.integration.test.ts --timeout 30000`
  — **17 passed, 193 assertions, 0 failures**.
- `bun run audit`: blocked before Ecommerce discovery by unrelated duplicate
  Employees datasource `employee_language_options` in
  `services/employees/pages/employees.yaml`; no non-Ecommerce file was changed.
- Scoped ESLint: `bunx eslint test/ecommerce_product_page_grid_columns.integration.test.ts` — passed.
- `git diff --check`: passed for the current Ecommerce/plan changes.
