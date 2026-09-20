# INV-PRODUCT-REPLENISH-001 source comparison

## Odoo source contract

- The Inventory product form binds `action_product_replenishment` and
  `action_product_template_replenishment` (`stock` addon,
  `addons/stock/views/product_views.xml:39-85`) to the `product.replenish`
  modal for inventory-managed products.
- `addons/stock/wizard/product_replenish_views.xml:3-61` defines the modal:
  product and forecast context, quantity/UoM, scheduled date, warehouse, route,
  Confirm (`launch_replenishment`), and Discard.
- `addons/stock/wizard/product_replenish.py:9-115` supplies product/template
  defaults, forecasted quantity, warehouse/route defaults, and the launch
  procurement call. The Core3 slice stops at the durable request boundary;
  downstream procurement rule/PO/MO generation and notification links remain
  open.
- The source menu/action audit records Inventory > Products > Products as
  `stock.menu_product_variant_config_stock` / `product_template_action_product`
  at `/odoo/action-433` (`plan/odoo-ui-parity/inventory.md:78`).

## Core3 mapping

- `pages/stock-report.yaml` remains presentation-only and adds the manager
  Replenish row action. `api/stock-report.yaml` owns the navigation action and
  passes product ID, row version, name, forecast, and unit context.
- `pages/product-replenish.yaml` is layout-only; `api/product-replenish.yaml`
  owns `page.id: product-replenish`, context/catalog/history sources, and the
  `inventory.product.replenish` server form at `/stock-report/replenish`.
- Migration `20260921150000-041-inventory-product-replenishment.yaml` adds the
  durable request ledger and deterministic seeded request. Confirm records
  quantity, date, warehouse, route, actor, company, forecast, and Requested
  state with product row-version and company/actor/field guards.

## Evidence

- Core3 authenticated desktop: `core3-desktop-context.png`,
  `core3-desktop-form.png`, `desktop-final.png`.
- Core3 authenticated mobile: `core3-mobile-context.png`, `mobile-final.png`.
- Browser JSON records report zero failed requests, page errors, HTTP error
  responses, and no horizontal overflow; desktop Confirm persists a second
  request (`12 Units`, `2026-01-22`, `Manufacture`, `Admin User`) and mobile
  reload shows both durable rows.
- Odoo authenticated desktop/mobile route captures and exact route blocker are
  in `odoo-desktop-products.png`, `odoo-mobile-products.png`,
  `odoo-browser.json`, and `odoo-mobile-browser.json`.
