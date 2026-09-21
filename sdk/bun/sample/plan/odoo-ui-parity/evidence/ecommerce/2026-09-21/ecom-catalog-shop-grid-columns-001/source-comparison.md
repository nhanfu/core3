# Source comparison

Reference: Odoo 19 `/home/nhanjs/projects/odoo/addons/website_sale`.

`models/website.py` defines `shop_ppr` as the number of grid columns on the
Shop, defaulting to 3. The Website Sale builder option declares 2, 3, 4, and
5 column choices and `SetPprAction` persists the selection through
`/shop/config/website` as `shop_ppr`.

Core3 maps that action to:

- durable table `ecommerce_shop_grid_columns_policies`;
- deterministic `My Company` fixture with 3 columns;
- `api/shop-grid-columns-policy.yaml` and
  `pages/shop-grid-columns-policy.yaml`, joined by the same page ID;
- a read-only Shop projection and manifest configuration entry.

The update requires `ecommerce.write`, validates the exact builder choices,
scopes the row to the active company, and requires the expected row version.
Migration replay and repeated fixture loading do not duplicate durable state.
