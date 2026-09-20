# Product Export evidence

- Feature: `ECOM-CATALOG-PRODUCT-EXPORT-001`
- Core3 browser status: blocked before authenticated render because shared
  module discovery fails on unrelated Inventory YAML with
  `actions[0].title is not allowed`. The temporary Ecommerce runtime was
  removed; no runtime files are part of the Ecommerce change.
- Odoo comparison: `/shop` returned exact HTTP 404 on ports 8069 and 8073.
  The Website/eCommerce reference surface is unavailable, so paired visual
  comparison is blocked and no sign-off is claimed.

The bounded contract and persistence tests remain the source of truth for the
export behavior until the shared discovery boundary is repaired and a fresh
authenticated Core3 desktop/mobile capture can be taken.
