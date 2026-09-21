# URL product documents evidence

Feature: `ECOM-CATALOG-PRODUCT-DOCUMENT-URL-001`

This bounded slice implements Odoo Website Sale URL-backed product documents.
It persists URL documents alongside file documents, keeps the existing page and
API YAML contracts separate, validates permissioned optimistic URL updates,
and exposes a public published-product redirect boundary.

- [Source comparison](source-comparison.md)
- [Functionality](functionality.md)
- [Test results](test-results.md)
- [Browser/Odoo check](browser-check.md)
- [QA inventory](qa-inventory.md)

The bounded implementation is verified but not Ecommerce module sign-off.
