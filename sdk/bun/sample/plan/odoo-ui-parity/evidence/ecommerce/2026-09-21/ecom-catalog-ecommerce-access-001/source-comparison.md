# Source comparison

The supplied Odoo 19 Website Sale source was inspected at
`/home/nhanjs/projects/odoo/addons/website_sale`.

- `models/website.py` defines required `ecommerce_access` values `everyone`
  and `logged_in`, defaulting to everyone, plus `has_ecommerce_access()`.
- `models/res_config_settings.py` relates `ecommerce_access` to the website.
- `views/res_config_settings_views.xml` exposes the
  `ecommerce_access_setting` control titled “Shop, products, cart and wishlist
  visibility”.
- `controllers/main.py` redirects a public visitor away from `/shop` and
  product pages when access is restricted.
- The website templates/menu and cart/product paths consult
  `has_ecommerce_access()`.

Core3 comparison: migrations 120/121 add the company policy and deterministic
fixture. `pages/ecommerce-access-policy.yaml` and
`api/ecommerce-access-policy.yaml` join by `page.id`. The Ecommerce module
resolves the authenticated actor at public-route time, blocks logged-out shop,
cart, checkout, and wishlist requests with the declared 401 boundary, and
passes authentication into the public shop operation. The anonymous shop add
action has the same declarative guard.
