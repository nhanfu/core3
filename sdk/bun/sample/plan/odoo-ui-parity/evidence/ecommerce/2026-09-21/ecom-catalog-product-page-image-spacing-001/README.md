# ECOM-CATALOG-PRODUCT-PAGE-IMAGE-SPACING-001

Wave 33 bounded Ecommerce parity evidence for Odoo Website Sale's product
page image spacing policy.

- Source comparison: [source-comparison.md](source-comparison.md)
- Functionality and lifecycle: [functionality.md](functionality.md)
- Focused results: [test-results.md](test-results.md)
- Browser/Odoo availability: [browser-check.md](browser-check.md)
- QA inventory: [qa-inventory.md](qa-inventory.md)

The source-backed values are None, Small, Medium, and Big. Core3 persists a
company-scoped policy, exposes separate page/API YAML contracts, projects the
effective policy on Product Detail, and guards updates with permissions,
validation, company scope, optimistic concurrency, replay safety, and restart
persistence.

This is a bounded slice, not Ecommerce module sign-off. Browser evidence is
blocked by unavailable Core3 ports and the supplied Odoo `/shop` HTTP 404.
