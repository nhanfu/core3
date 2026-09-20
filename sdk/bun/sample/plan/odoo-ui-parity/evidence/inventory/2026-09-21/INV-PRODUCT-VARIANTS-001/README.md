# Inventory Product Variants evidence

Bounded tenth-wave Inventory slice: `INV-PRODUCT-VARIANTS-001`.

- Odoo source: `stock.product_product_menu` opens `stock_product_normal_action`
  for `product.product` with `list,form,kanban`; stock extends the variant list
  with On Hand and Forecasted fields.
- Core3 contracts: `services/inventory/pages/product-variants.yaml` and
  `services/inventory/api/product-variants.yaml`, plus the detail pair, join by
  `page.id`. Migration `20260921210000-047-inventory-product-variants.yaml`
  supplies durable stock-facing variant data.
- Focused proof: `test/inventory_product_variants.integration.test.ts` covers
  discovery, deterministic fixtures, manager CRUD, archive/restore/delete,
  company and permission boundaries, stale writes, and file-backed restart.
- Core3 captures: authenticated desktop/mobile list and detail states are in
  `core3-desktop-*.png` and `core3-mobile-*.png`; the mobile create form is
  also captured. `browser-results.json` records viewport widths and network/
  console observations.
- Odoo captures: `odoo-desktop.png` and `odoo-mobile.png` are authenticated
  paired probes. The requested action route redirected to Discuss, so no
  Product Variants screen is claimed.

This is bounded evidence only; full Inventory sign-off remains open.
