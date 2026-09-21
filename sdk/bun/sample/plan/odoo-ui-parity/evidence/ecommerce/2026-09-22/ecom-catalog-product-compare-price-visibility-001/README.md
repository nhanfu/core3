# Product Comparison Price visibility evidence

Feature: `ECOM-CATALOG-PRODUCT-COMPARE-PRICE-VISIBILITY-001`

The focused integration test passed with 2 tests, 33 assertions, and 0
failures. It verifies Odoo source tracing, page/API separation, the durable
policy, permissioned boolean/company/stale guards, migration replay, gated
Product/Variant/Shop projections, and DuckDB restart persistence.

The prior compare-at CRUD suite was updated to enable the policy explicitly and
passes with 3 tests. The adjacent Product Detail, Product Reference Price,
Product Page Grid Columns, and Shop Action Style suites also pass.

Authenticated Odoo comparison used `http://localhost:8069`, database
`core3_reference`, and the shared QA session. The authenticated `/shop` route
returned Odoo's exact `Error 404` page at desktop and iPhone-14 mobile
viewports. Website Sale/eCommerce is unavailable in the live reference, so
the paired feature-rendering comparison is blocked and no visual sign-off is
claimed.

Core3 browser rendering was blocked at verification time because ports 3000,
4312, and 4313 refused connections.

Files:

- `source-comparison.md` — local Odoo 19 and Core3 source trace.
- `functionality.md` — bounded behavior and acceptance outcomes.
- `qa-inventory.md` — stable case inventory and result mapping.
- `test-results.md` — exact focused and adjacent test commands/results.
- `browser-check.md` — authenticated desktop/mobile captures and blockers.
- `odoo-desktop-shop-404.png` — authenticated Odoo desktop blocker capture.
- `odoo-mobile-shop-404.png` — authenticated Odoo iPhone-14 blocker capture.
