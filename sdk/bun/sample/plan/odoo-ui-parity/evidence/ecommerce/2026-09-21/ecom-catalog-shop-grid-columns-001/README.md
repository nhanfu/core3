# ECOM-CATALOG-SHOP-GRID-COLUMNS-001

Wave 38 bounded Ecommerce parity evidence for Odoo Website Sale's Shop grid
column policy.

- [Source comparison](source-comparison.md)
- [Functionality and lifecycle](functionality.md)
- [Focused and regression results](test-results.md)
- [Browser/Odoo availability](browser-check.md)
- [QA inventory](qa-inventory.md)

Core3 persists a company-scoped 2/3/4/5-column policy, exposes separate
page/API YAML contracts, projects the effective value through Shop, and guards
updates with permissions, validation, company scope, optimistic concurrency,
replay safety, and restart persistence. This is a bounded slice, not Ecommerce
module sign-off.
