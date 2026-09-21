# Source comparison

- Odoo model: `website.shop_opt_products_design_classes` is a persisted
  website field whose default class list includes
  `o_wsale_products_opt_has_cta`.
- Odoo builder control: `products_design_panel.xml` exposes an Add to Cart
  `BuilderButton` with class action
  `o_wsale_products_opt_has_cta`.
- Odoo save boundary: `products_design_panel_plugin.js` collects the
  `o_wsale_products_opt_*` classes and persists
  `shop_opt_products_design_classes` through `/shop/config/website`.
- Odoo rendering: `product_tile_templates.xml` gates the quick-add button
  through `product_tile_element_visibility` and the CTA class; the supplied
  product-tile stylesheet sets `--o-wsale-card-btn-submit-display` for that
  class.
- Core3 mapping: migrations 152/153 persist the company-scoped boolean;
  `api/shop-product-cta-policy.yaml` and
  `pages/shop-product-cta-policy.yaml` join through
  `ecommerce-shop-product-cta-policy`; Shop reads the effective policy
  through `ecommerce_shop_product_cta` and `ecommerce_shop_products.show_cta`.
