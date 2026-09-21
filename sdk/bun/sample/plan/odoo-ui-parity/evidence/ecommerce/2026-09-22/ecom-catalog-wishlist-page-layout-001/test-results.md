# Test results

Focused and adjacent command:

```text
bun test ./test/ecommerce_wishlist_page_layout.integration.test.ts ./test/ecommerce_wishlist.integration.test.ts ./test/ecommerce_wishlist_merge.integration.test.ts ./test/ecommerce_product_compare_price_visibility.integration.test.ts --timeout 30000
11 pass, 0 fail, 125 expect() calls
```

Coverage includes source tracing, page/API joins, menu ownership, defaults,
option sources, invalid desktop/mobile/gap values, company and stale guards,
missing fixture reads, migration replay, Wishlist projection, and DuckDB
restart persistence. Existing wishlist lifecycle/merge and compare-price
visibility regressions also pass.

Additional checks:

```text
bun run audit
UI audit: 802 pages, 811 routes, 1656 datasources
UI audit passed

bun run css:build:ecommerce
passed

bun x eslint test/ecommerce_wishlist_page_layout.integration.test.ts
passed

git diff --check
passed
```

The authenticated Core3 browser runtime remains unavailable; no other module
was modified.
