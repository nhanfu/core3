# Test and static verification results

- Focused feature: `bun test sample/test/ecommerce_product_category_assignments.integration.test.ts`
  — **3 passed, 31 assertions, 0 failures**.
- Focused regression: the feature test plus Product Detail, Products,
  Categories, and Shop integration tests — **15 passed, 113 assertions,
  0 failures**.
- UI audit: `bun run audit` — **718 pages, 727 routes, 1379 datasources**;
  passed.
- Scoped lint: `bunx eslint
  test/ecommerce_product_category_assignments.integration.test.ts` — passed.
- Diff check: `git diff --check` — passed before staging.
