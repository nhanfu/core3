# Test results

- Focused: `bun test ./test/ecommerce_shop_product_descriptions.integration.test.ts`
  — **2 passed, 29 assertions, 0 failures**.
- Adjacent Shop regression initially had **10 passes and one existing
  grid-columns 5000ms timeout**. The timeout was rerun independently and
  passed **2 tests, 26 assertions, 0 failures**; the other four files passed
  in the combined run.
- `bunx eslint test/ecommerce_shop_product_descriptions.integration.test.ts`
  — passed.
- `bun run audit` — passed at **758 pages, 767 routes, and 1544
  datasources**.
- `git diff --check` — passed for the Ecommerce-owned implementation,
  test, plan, QA, and evidence paths.
