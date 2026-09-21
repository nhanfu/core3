# Test results

- Focused: `bun test
  test/ecommerce_product_page_image_width.integration.test.ts --timeout
  30000` — **2 passed, 25 assertions, 0 failures**.
- Regression: image-width + image-layout + image-ratio + Product Detail — **11
  passed, 103 assertions, 0 failures**.
- `bun run audit` — **passed**, 743 pages, 752 routes, 1472 datasources.
- Scoped ESLint — **passed**.
- `git diff --check` — **passed**.
