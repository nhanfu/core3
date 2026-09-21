# Source comparison

Reference: Odoo 19 `/home/nhanjs/projects/odoo/addons/website_sale`.

Odoo `models/website.py` defines `product_page_cols_order` with the selection
values `regular` (Regular order) and `inverse` (Inverse order), defaulting to
`regular`. `views/templates.xml` applies `flex-lg-row-reverse` to the main
product-page row when the value is `inverse`.

Core3 maps that source setting to:

- durable table `ecommerce_product_page_columns_order_policies`;
- deterministic `My Company` fixture with `regular`;
- `api/product-page-columns-order-policy.yaml` and
  `pages/product-page-columns-order-policy.yaml`, joined by the same page ID;
- Product Detail read projection and manifest configuration entry.

The policy action requires `ecommerce.write`, validates the exact two source
values, scopes the row to the active company, and requires the expected row
version. Replayed migration and mutation attempts do not duplicate or bypass
the durable state.
