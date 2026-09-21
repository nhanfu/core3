# Shop Product-Card Wishlist visibility evidence

Feature: `ECOM-CATALOG-SHOP-PRODUCT-WISHLIST-VISIBILITY-001`

This bounded slice covers the Website Sale Wishlist design toggle, durable
company policy, Shop projection, permissioned optimistic update, migration
replay, and DuckDB restart persistence. It does not duplicate the existing
wishlist lifecycle or session-merge features.

Files:

- `source-comparison.md` — local Odoo 19 and Core3 source trace.
- `functionality.md` — bounded behavior and acceptance outcomes.
- `qa-inventory.md` — stable case inventory and result mapping.
- `test-results.md` — exact focused and adjacent test commands/results.
- `browser-check.md` — authenticated desktop/mobile captures and blockers.
- `odoo-desktop-shop-404.png` — authenticated Odoo desktop blocker capture.
- `odoo-mobile-shop-404.png` — authenticated Odoo iPhone-14 blocker capture.
