# Test results

- Focused: `bun test ./test/ecommerce_shop_product_wishlist.integration.test.ts --timeout 30000` — **2 passed, 31 assertions, 0 failures**.
- Adjacent Shop regression: `bun test ./test/ecommerce_shop*.integration.test.ts --timeout 30000` — **26 passed, 362 assertions, 0 failures** across 12 files.
- Wishlist regression: `bun test ./test/ecommerce_wishlist*.integration.test.ts --timeout 30000` — **7 passed, 50 assertions, 0 failures** across 2 files.
- UI audit: `bun run audit` — **793 pages, 802 routes, 1633 datasources; passed**.
- `git diff --check` — passed for the owned Ecommerce implementation, plan,
  QA, progress, and evidence paths.
