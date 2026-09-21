# Source comparison

Reference: Odoo 19 `/home/nhanjs/projects/odoo/addons/website_sale`.

`models/website.py` defines `shop_ppg` as the number of products in the Shop
grid, defaulting to 21. The Website Sale builder's `SetPpgAction` rejects a
non-positive value, clamps the value to 10,000, and persists it through
`/shop/config/website` as `shop_ppg`.

Core3 maps that action to:

- durable table `ecommerce_shop_page_size_policies`;
- deterministic `My Company` fixture with 21 products per page;
- `api/shop-page-size-policy.yaml` and `pages/shop-page-size-policy.yaml`,
  joined by the same page ID;
- a read-only Shop projection and manifest configuration entry.

The update requires `ecommerce.write`, validates the exact source range,
scopes the row to the active company, and requires the expected row version.
Migration replay and repeated fixture loading do not duplicate durable state.
