# Test results

Command:

`bun test --timeout 20000 ./test/ecommerce_delivery_zip_prefix_matching.integration.test.ts ./test/ecommerce_delivery_methods.integration.test.ts`

Result: **7 tests passed, 0 failed, 49 expect() calls**.

Coverage includes Odoo source anchors and page/API separation, durable
assignment persistence, projected prefix names, normal prefix matching,
anchored exact matching (`700$`), non-matching exclusion, checkout rejection,
permissioned delivery-method contracts, migration replay, and DuckDB restart.
