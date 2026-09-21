# Ecommerce order assignment evidence

Feature: `ECOM-CHECKOUT-ORDER-ASSIGNMENT-001`

This bounded slice implements Odoo Website Sale's Orders Assignment settings:
the company-scoped Sales Team and Salesperson defaults used for online orders.
The configuration page and API are separate YAML contracts joined by
`page.id`. Checkout snapshots the selected assignment on authenticated and
guest orders and on the Ecommerce-to-Sales handoff envelope.

- [Source comparison](source-comparison.md)
- [Functionality](functionality.md)
- [Test results](test-results.md)
- [Browser/Odoo check](browser-check.md)
- [QA inventory](qa-inventory.md)

The bounded implementation is verified but not Ecommerce module sign-off.
