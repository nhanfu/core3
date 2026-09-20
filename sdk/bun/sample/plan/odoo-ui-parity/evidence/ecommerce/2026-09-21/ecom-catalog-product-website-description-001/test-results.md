# Test results

- `bun test ./test/ecommerce_product_website_description.integration.test.ts
  --timeout 20000` — **3 passed, 24 assertions, 0 failures**.
- Adjacent Product Detail, Shop, Product Variants, Cart, and Compare-Price
  tests — **17 passed, 129 assertions, 0 failures**; combined bounded set
  **20 passed, 153 assertions, 0 failures**.
- Paired Ecommerce page/API schema validation for Products, Shop, and Product
  Detail — **passed**.
- `bun scripts/audit-order-ui.ts` — **blocked** by unrelated Timesheets page
  schema fields `components[0].search.categories` and
  `components[0].search.or locations...`.
- `bunx eslint test/ecommerce_product_website_description.integration.test.ts`
  and `git diff --check` — **passed**.
- Full repository regression was not run; unrelated owner scopes remain
  outside this bounded verification.
