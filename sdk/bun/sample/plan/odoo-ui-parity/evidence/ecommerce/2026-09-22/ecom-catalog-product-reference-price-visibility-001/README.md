# Product Reference Price visibility evidence

Feature: `ECOM-CATALOG-PRODUCT-REFERENCE-PRICE-VISIBILITY-001`

The focused integration test passed with 2 tests, 29 assertions, and 0
failures. It verifies Odoo source tracing, page/API separation, the durable
policy, permissioned boolean/company/stale guards, migration replay, gated
variant projections, and DuckDB restart persistence.

Authenticated Odoo comparison used `http://localhost:8069` and the supplied
`core3_reference` QA session. The authenticated `/shop` route returned Odoo's
exact `Error 404` page at both desktop and iPhone-14 mobile viewports. The
Website Sale/eCommerce screen is therefore unavailable in the live reference;
the paired feature-rendering comparison is blocked and no visual sign-off is
claimed.

Core3 browser rendering was also blocked at verification time because ports
3000, 4312, and 4313 refused connections.

Files:

- `source-comparison.md` — local Odoo 19 and Core3 source trace.
- `odoo-desktop-shop-404.png` — authenticated 1916×833 Odoo blocker capture.
- `odoo-mobile-shop-404.png` — authenticated iPhone-14 390×844 blocker capture.
