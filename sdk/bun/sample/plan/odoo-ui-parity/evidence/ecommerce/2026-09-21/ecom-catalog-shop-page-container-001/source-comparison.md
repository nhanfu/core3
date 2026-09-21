# Source comparison

Reference: Odoo 19 `/home/nhanjs/projects/odoo/addons/website_sale`.

`models/website.py` defines `shop_page_container` with `regular` (Regular) and
`fluid` (Full-width), defaulting to Regular. `views/templates.xml` uses
`website.shop_page_container == 'fluid'` to select the full-width Shop layout.

Core3 maps that setting to:

- durable table `ecommerce_shop_page_container_policies`;
- deterministic `My Company` fixture with `regular`;
- `api/shop-page-container-policy.yaml` and
  `pages/shop-page-container-policy.yaml`, joined by the same page ID;
- a read-only Shop projection and manifest configuration entry.

The update requires `ecommerce.write`, validates the exact two source values,
scopes the row to the active company, and requires the expected row version.
Migration replay and repeated fixture loading do not duplicate durable state.
