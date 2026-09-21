# Product page image ratios evidence

Feature: `ECOM-CATALOG-PRODUCT-PAGE-IMAGE-RATIO-001`

This bounded slice implements Odoo Website Sale's desktop and mobile product
page image-ratio policy. It persists a company-scoped policy, keeps the
configuration page/API separate, projects the effective values on Product
Detail, and guards updates with permissions, validation, company scope, and
optimistic concurrency.

- [Source comparison](source-comparison.md)
- [Functionality](functionality.md)
- [Test results](test-results.md)
- [Browser/Odoo check](browser-check.md)
- [QA inventory](qa-inventory.md)

The bounded implementation is verified but not Ecommerce module sign-off.
