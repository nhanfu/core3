# Odoo analysis

Local source: Odoo 19 `website_sale_wishlist` under
`/home/nhanjs/projects/odoo/addons/website_sale_wishlist`.

- `views/website_sale_wishlist_template.xml:368-388` renders the saved
  product card's `o_wish_add` button with product template, product variant,
  product type, and attribute-value IDs.
- `static/src/interactions/product_wishlist.js:24-50` sends the saved item to
  the normal cart service without an immediate redirect. When the returned
  quantity is positive, it removes the wishlist row; if no wishlist IDs
  remain, the interaction redirects to `/shop/cart`.
- `controllers/main.py:35-43` renders `/shop/wishlist`; the route is public in
  source, while Core3's existing internal Wishlist page remains an
  authenticated management surface.

Live authenticated reference: `http://localhost:8069`, database
`core3_reference`, BrowserSkill instance `245ea108`. `/shop/wishlist` returned
the Odoo Error 404 page at desktop and iPhone-14 mobile viewports because the
reference database does not have Website Sale/Wishlist installed.
