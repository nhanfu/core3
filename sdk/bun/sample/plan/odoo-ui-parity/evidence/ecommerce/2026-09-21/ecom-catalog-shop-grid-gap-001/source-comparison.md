# Source comparison

Reference: Odoo 19 `/home/nhanjs/projects/odoo/addons/website_sale`.

`models/website.py` defines `shop_gap` as the Shop grid CSS gap, defaulting to
`16px`. `products_design_panel_plugin.js` registers `setGap`, applies the value
to `--o-wsale-products-grid-gap`, and saves it as `shop_gap`; the Products
Design Panel XML exposes a 0–28px range in px.

Core3 maps that action to:

- durable table `ecommerce_shop_grid_gap_policies`;
- deterministic `My Company` fixture with `16px`;
- `api/shop-grid-gap-policy.yaml` and `pages/shop-grid-gap-policy.yaml`,
  joined by the same page ID;
- a read-only Shop projection and manifest configuration entry.

The update requires `ecommerce.write`, validates the exact source CSS range,
scopes the row to the active company, and requires the expected row version.
Migration replay and repeated fixture loading do not duplicate durable state.
