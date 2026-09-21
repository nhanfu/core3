# Test results

- Focused: `bun test
  test/ecommerce_product_page_image_ratio.integration.test.ts --timeout
  30000` — **2 passed, 25 assertions, 0 failures**.
- Focused regression: image-ratio + Product Detail — **7 passed, 53
  assertions, 0 failures**.
- Additional Products integration check retains a pre-existing discovery
  rejection for unsupported `components[1].search.contact` and
  `components[1].search.or source document`; it is outside this slice and was
  not altered.
- `bun run audit` — **passed**, 737 pages, 746 routes, 1449 datasources.
- Scoped ESLint — **passed**.
- `git diff --check` — **passed**.
