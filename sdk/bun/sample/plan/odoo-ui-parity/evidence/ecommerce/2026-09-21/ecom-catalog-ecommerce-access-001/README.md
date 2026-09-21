# Ecommerce access policy evidence

Feature: `ECOM-CATALOG-ECOMMERCE-ACCESS-001`

This bounded slice implements Odoo Website Sale's `ecommerce_access` setting:
All users or Logged in users. It persists a company policy, keeps page and API
YAML separate, enforces the setting at public Ecommerce routes and shop/add
contracts, and preserves authenticated access.

- [Source comparison](source-comparison.md)
- [Functionality](functionality.md)
- [Test results](test-results.md)
- [Browser/Odoo check](browser-check.md)
- [QA inventory](qa-inventory.md)

The bounded implementation is verified but not Ecommerce module sign-off.
