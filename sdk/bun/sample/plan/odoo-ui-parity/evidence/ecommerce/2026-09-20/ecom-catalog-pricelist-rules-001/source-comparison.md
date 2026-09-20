# Source comparison

## Odoo source

- `addons/website_sale/views/website_sale_menus.xml`: Website > Configuration
  > eCommerce > Products > Pricelists uses
  `product.product_pricelist_action2` and the pricelist permission group.
- `addons/product/models/product_pricelist_item.py`: `product.pricelist.item`
  orders by target and minimum quantity, supports global/category/product/
  variant targets, date windows, minimum quantity, list/cost/other-pricelist
  bases, fixed/percentage/formula computation, rounding, surcharge, and
  minimum/maximum margins.
- `addons/product/views/product_pricelist_item_views.xml`: the list/form
  exposes Apply On, Price, Min Qty, dates, pricing type, base, fixed price,
  discount, formula, rounding, surcharge, and margins.

## Core3 mapping

- `services/ecommerce/pages/pricelist-detail.yaml` owns the authenticated
  detail page and a top-level Odoo `ListView` for rules; it does not duplicate
  API queries or action definitions.
- `services/ecommerce/api/pricelist-detail.yaml` owns the `page.id`-matched
  detail/rules/options datasources and permissioned server-form CRUD actions.
- Migration `20260920230000-046-ecommerce-pricelist-rules.yaml` adds durable
  target, computation, margin, base-pricelist, and `row_version` fields.
  Migration `20260920231000-047-ecommerce-pricelist-rules-demo.yaml` upgrades
  the deterministic three-rule fixture set.
- `services/ecommerce/api/cart.yaml` applies the durable rule target and
  fixed/percentage/formula calculation when a pricelist is selected.

The current Ecommerce catalog has no separate `product.product` variant table;
the variant target is therefore validated against the durable product table
and remains an explicit follow-up for true template/variant resolution.
