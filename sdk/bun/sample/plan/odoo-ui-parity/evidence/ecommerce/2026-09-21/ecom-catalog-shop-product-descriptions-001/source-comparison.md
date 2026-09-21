# Source comparison

- Odoo model: `website.shop_opt_products_design_classes` is a persisted
  website field whose default class list includes
  `o_wsale_products_opt_has_description`.
- Odoo builder control: `products_design_panel.xml` exposes a Description
  `BuilderCheckbox classAction="'o_wsale_products_opt_has_description'"`.
- Odoo save boundary: `products_design_panel_plugin.js` collects the
  `o_wsale_products_opt_*` classes and persists
  `shop_opt_products_design_classes` through `/shop/config/website`.
- Odoo rendering: `templates.xml` applies
  `website.shop_opt_products_design_classes` to `#o_wsale_products_grid` and
  passes the same design field into `website_sale.products_item`.
- Core3 mapping: migrations 150/151 persist the company-scoped boolean;
  `api/shop-product-descriptions-policy.yaml` and
  `pages/shop-product-descriptions-policy.yaml` join through
  `ecommerce-shop-product-descriptions-policy`; Shop reads the effective
  policy through `ecommerce_shop_product_descriptions` and
  `ecommerce_shop_products.show_descriptions`.
