# ECOM-CATALOG-PRODUCT-WEBSITE-SEQUENCE-REORDER-001

Wave 17 bounded Ecommerce parity evidence for Website Sale product ordering.
This record covers the four Odoo sequence workflows and does not represent
Ecommerce module sign-off.

- Feature: `website_sequence` top, bottom, up, and down reordering.
- Core3: durable migrations 098/099, separate Products page/API YAML, scoped
  permission and optimistic-concurrency guards.
- Verification: focused workflow tests, Products/Product Detail/Shop
  regression, UI audit, scoped lint, and diff check.
- Browser/Odoo status: authenticated desktop/mobile capture is blocked by the
  unavailable browser/runtime ports; Odoo `/shop` is an exact HTTP 404 on the
  supplied local ports.
- No screenshot or rendered-UI sign-off is claimed. Nothing was pushed.
