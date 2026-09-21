# Source comparison

- Odoo model: `website.shop_opt_products_design_classes` is a persisted
  website field whose default class list includes
  `o_wsale_products_opt_actions_subtle`.
- Odoo builder control: `products_design_panel.xml` exposes Subtle, Promote,
  and Theme Colors `BuilderSelectItem` class actions.
- Odoo save boundary: `products_design_panel_plugin.js` collects the
  `o_wsale_products_opt_*` classes and persists
  `shop_opt_products_design_classes` through `/shop/config/website`.
- Odoo rendering: `product_tile.scss` uses the three action-style classes to
  apply subtle, promoted, or theme-color button treatments.
- Core3 mapping: migrations 156/157 persist the company-scoped enum;
  `api/shop-product-action-style-policy.yaml` and
  `pages/shop-product-action-style-policy.yaml` join through
  `ecommerce-shop-product-action-style-policy`; Shop reads the effective
  policy through `ecommerce_shop_product_action_style` and
  `ecommerce_shop_products.action_style`.
