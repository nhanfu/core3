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

`git diff --check` is required before commit. A repository-wide `bun run audit`
was not used as a sign-off gate because the shared checkout has unrelated
module-level YAML/runtime blockers; no other module was modified.
