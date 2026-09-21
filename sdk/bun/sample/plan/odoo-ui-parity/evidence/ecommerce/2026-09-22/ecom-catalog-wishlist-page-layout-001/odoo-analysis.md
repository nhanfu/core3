# Odoo analysis

Reference source: `/home/nhanjs/projects/odoo/addons/website_sale_wishlist`.

- `models/website.py` defines `wishlist_grid_columns` default 5,
  `wishlist_mobile_columns` default 2, and `wishlist_gap` default `16px`.
- `static/src/website_builder/wishlist_page_option.xml` exposes Desktop
  choices 2–6 Columns and Mobile choices 1–2 Columns.
- `static/src/website_builder/products_design_panel.xml` overrides the Gap
  control for Wishlist Page and uses a 0–28px range in px.
- `static/src/website_builder/wishlist_page_option_plugin.js` persists the
  data attributes and `--o-wsale-wishlist-grid-gap` through the builder save
  payload and registers the three actions.
- `views/website_sale_wishlist_template.xml` emits
  `data-wishlist-grid-columns`, `data-wishlist-mobile-columns`, and the gap
  custom property on `#o_comparelist_table`.
- `static/src/scss/website_sale_wishlist.scss` applies mobile 1/2-column and
  desktop 2–6-column responsive grid rules.

The authenticated reference at `http://localhost:8069`, database
`core3_reference`, returned the Odoo 404 page for `/shop/wishlist` at both
desktop and iPhone-14 mobile viewports. The supplied database therefore cannot
render the Website Sale/Wishlist builder or customer page.
