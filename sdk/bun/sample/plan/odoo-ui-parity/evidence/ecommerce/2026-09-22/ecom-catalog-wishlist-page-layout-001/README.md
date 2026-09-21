# Wishlist Page Layout evidence

Feature: `ECOM-CATALOG-WISHLIST-PAGE-LAYOUT-001`

This slice covers the Odoo Wishlist Page desktop/mobile grid columns and grid
gap policy, durable company-scoped persistence, permissioned optimistic update,
Wishlist projection, migration replay, and DuckDB restart persistence.

- `odoo-analysis.md` — local Odoo 19 source and authenticated reference trace.
- `functionality-checklist.md` — bounded acceptance cases and results.
- `source-comparison.md` — Odoo/Core3 gap comparison.
- `gap-matrix.md` — implementation mapping and remaining visual blocker.
- `test-results.md` — exact test, lint, and diff-check results.
- `verification.md` — authenticated browser verification and blocker record.
- `browser-check.md` — bsk session/browser details without credentials.
- `odoo-desktop-wishlist-404.png` and `odoo-mobile-wishlist-404.png` —
  authenticated Odoo blocker captures.

No Core3 screenshots are included because ports 3000, 4312, and 4313 refused
connections; no Core3 visual-parity claim is made.
