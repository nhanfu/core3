# Source comparison

- Odoo model: `website.shop_opt_products_design_classes` is a persisted
  website field whose default class list includes
  `o_wsale_products_opt_actions_onhover`.
- Odoo builder controls: `products_design_panel.xml` exposes
  `o_wsale_products_opt_actions_inline` and
  `o_wsale_products_opt_actions_onhover` in the Buttons row.
- Odoo save boundary: `products_design_panel_plugin.js` collects the
  `o_wsale_products_opt_*` classes and persists
  `shop_opt_products_design_classes` through `/shop/config/website`.
- Odoo rendering: `product_tile.scss` uses the inline and on-hover classes to
  change card action placement, visibility, and hover transitions.
- Core3 mapping: migrations 154/155 persist the company-scoped enum;
  `api/shop-product-action-placement-policy.yaml` and
  `pages/shop-product-action-placement-policy.yaml` join through
  `ecommerce-shop-product-action-placement-policy`; Shop reads the effective
  policy through `ecommerce_shop_product_action_placement` and
  `ecommerce_shop_products.action_placement`.
