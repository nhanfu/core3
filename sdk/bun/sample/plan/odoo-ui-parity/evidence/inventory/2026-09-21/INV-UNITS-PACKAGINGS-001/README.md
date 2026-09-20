# Inventory Units & Packagings evidence

Bounded eleventh-wave Inventory slice: `INV-UNITS-PACKAGINGS-001`.

- Odoo source: `stock_menu_views.xml:20-34` binds the Configuration → Products
  menu `menu_stock_uom_form_action` to `uom.product_uom_form_action`; the UoM
  action in `uom/views/uom_uom_views.xml:3-61` uses model `uom.uom` with
  list/form views and is gated by `uom.group_uom`.
- Core3 contracts: `services/inventory/pages/units-packagings.yaml` and
  `api/units-packagings.yaml`, plus the detail pair, join by `page.id`.
  Migration `20260921220000-048-inventory-units-packagings.yaml` supplies
  durable conversion/reference relationships, usage counts, company scope,
  active state, and deterministic fixtures.
- Focused proof: `test/inventory_units_packagings.integration.test.ts` covers
  discovery, source-shaped rows, reference validation, manager CRUD,
  archive/restore/delete guards, permission/company boundaries, stale writes,
  and file-backed restart persistence.
- Core3 captures: authenticated desktop/mobile list and detail states are in
  `core3-desktop-*.png` and `core3-mobile-*.png`. `browser-results.json`
  records widths and request/console observations.
- Odoo captures: `odoo-desktop.png` and `odoo-mobile.png` render the actual
  authenticated 21-row Units & Packagings action at `/odoo/action-90`.

This is bounded evidence only; full Inventory sign-off remains open.
