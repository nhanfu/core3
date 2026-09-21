# Test results

- Focused: `bun test
  test/ecommerce_product_page_image_layout.integration.test.ts --timeout
  30000` — **2 passed, 25 assertions, 0 failures**.
- Regression: image-layout + image-ratio + Product Detail — **9 passed, 78
  assertions, 0 failures**.
- `bun run audit` — **passed**, 739 pages, 748 routes, 1458 datasources.
- Scoped ESLint — **passed**.
- `git diff --check` — **passed**.
