# Product page image width evidence

Feature: `ECOM-CATALOG-PRODUCT-PAGE-IMAGE-WIDTH-001`

This bounded slice implements Odoo Website Sale's product image width policy.
It persists a company-scoped setting, keeps configuration page/API YAML
separate, projects the effective value on Product Detail, and guards updates
with permissions, validation, company scope, and optimistic concurrency.

- [Source comparison](source-comparison.md)
- [Functionality](functionality.md)
- [Test results](test-results.md)
- [Browser/Odoo check](browser-check.md)
- [QA inventory](qa-inventory.md)

The bounded implementation is verified but not Ecommerce module sign-off.
