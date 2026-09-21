# Test results

- Focused: `bun test
  test/ecommerce_product_document_url.integration.test.ts --timeout 30000`
  — **2 passed, 29 assertions, 0 failures**.
- Regression: URL-document plus existing product-document suites — **5 passed,
  62 assertions, 0 failures**.
- Scoped ESLint — **passed**.
- `bun run audit` — **passed**, 738 pages, 747 routes, 1454 datasources.
- `git diff --check` — **passed**.
