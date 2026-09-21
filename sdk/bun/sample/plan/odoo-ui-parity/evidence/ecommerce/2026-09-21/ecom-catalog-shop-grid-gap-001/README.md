# ECOM-CATALOG-SHOP-GRID-GAP-001

Wave 40 bounded Ecommerce parity evidence for Odoo Website Sale's Shop grid
gap policy.

- [Source comparison](source-comparison.md)
- [Functionality and lifecycle](functionality.md)
- [Focused and regression results](test-results.md)
- [Browser/Odoo availability](browser-check.md)
- [QA inventory](qa-inventory.md)

Core3 persists a company-scoped 0–28px grid-gap policy, exposes separate
page/API YAML contracts, projects the effective value through Shop, and guards
updates with permissions, validation, company scope, optimistic concurrency,
replay safety, and restart persistence. This is a bounded slice, not Ecommerce
module sign-off.
