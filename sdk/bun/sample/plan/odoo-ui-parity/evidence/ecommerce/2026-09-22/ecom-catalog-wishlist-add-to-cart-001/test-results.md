# Test results

- `bun test ./test/ecommerce_wishlist.integration.test.ts --timeout 30000`
  — **7 passed, 48 assertions, 0 failures**.
- Adjacent Wishlist regression (`bun test
  ./test/ecommerce_wishlist*.integration.test.ts --timeout 30000`) — **12
  passed, 109 assertions, 0 failures** across Wishlist lifecycle, merge, page
  layout, and Add to Cart.
- `bun run audit` — **808 pages, 817 routes, 1673 datasources; passed**.
- `bun run css:build:ecommerce` — passed.
- `git diff --check` scoped to Ecommerce implementation, test, plan, QA, and
  progress paths — passed.

The focused suite covers the existing Wishlist contract regressions plus the
new cart quantity merge, durable item removal, redirect intent, ownership,
company, stale/missing, unpublished-product, and DuckDB restart cases.
