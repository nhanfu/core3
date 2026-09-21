# Source comparison

- Odoo model: `website.shop_opt_products_design_classes` is the persisted
  Website field containing the `o_wsale_products_opt_*` Shop design classes.
- Odoo builder control: `products_design_panel.xml` exposes a Ratings
  `BuilderCheckbox` with class action
  `o_wsale_products_opt_has_rating`.
- Odoo save boundary: `products_design_panel_plugin.js` collects the class
  list and persists `shop_opt_products_design_classes` through
  `/shop/config/website`.
- Odoo rendering: `product_tile_templates.xml` gates the rating wrapper on
  `o_wsale_products_opt_has_rating` and supplies `rating_avg` and
  `rating_count` to the static rating widget.
- Core3 mapping: migrations 158/159 persist the company-scoped boolean;
  `api/shop-product-ratings-policy.yaml` and
  `pages/shop-product-ratings-policy.yaml` join through
  `ecommerce-shop-product-ratings-policy`; Shop reads the effective policy
  and active published review projection through
  `ecommerce_shop_product_ratings` and `ecommerce_shop_products`.
