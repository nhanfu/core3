# Product Variants source comparison

## Odoo source

- `addons/stock/views/product_views.xml:652-664` defines
  `stock_product_normal_action`: name `Product Variants`, model
  `product.product`, `view_mode` `list,form,kanban`, and the stock product
  search view.
- `addons/stock/views/product_views.xml:659-664` binds
  `product_product_menu` (`Product Variants`) under
  `menu_stock_inventory_control`, sequence 2, with
  `product.group_product_variant`.
- `addons/product/views/product_views.xml:421-455` defines the variant list
  fields: favorite, internal reference, barcode, name, variant values, company,
  sales/cost prices, category, type, unit, template, and active state.
- `addons/stock/views/product_views.xml:90-117` adds stock-specific On Hand and
  Forecasted columns from `qty_available` and `virtual_available`.

## Core3 mapping

- `pages/product-variants.yaml` and `api/product-variants.yaml` are separate;
  both declare `page.id: product-variants`. The detail pair uses
  `product-variant-detail`.
- Migration `0.0.47` stores variant identity, template/attribute display,
  company, type/tracking, prices, stock quantities, active state, and row
  version. Deterministic fixtures cover favorite, negative forecast, lot and
  serial tracking, archived, and shared-company cases.
- The list exposes Odoo's list and mobile kanban equivalent, search/filter/group
  context, stock On Hand/Forecasted columns, and a Product Variant form. The
  API owns all datasources and manager actions; presentation YAML owns only
  layout and action references.
- `inventory.read` protects list/detail reads and navigation. `inventory.manage`
  protects create/edit/archive/restore/delete. Current-company and shared-row
  visibility, duplicate reference/barcode, stock-in-use deletion, and required
  row-version guards are enforced by the YAML mutation contract.

The stock-facing Inventory surface is intentionally separate from Ecommerce's
customer/catalog variant implementation; no Ecommerce paths were changed.
