# Source comparison

Odoo Website Sale source inspected:

- `addons/website_sale/models/res_config_settings.py`: exposes
  `website_sale_prevent_zero_price_sale` and
  `website_sale_contact_us_button_url` as website-backed settings.
- `addons/website_sale/models/website.py`: stores
  `prevent_zero_price_sale` and `contact_us_button_url` on the website.
- `addons/website_sale/models/product_product.py`: `_is_add_to_cart_allowed`
  rejects a product when the website policy is enabled and contextual price is
  zero.
- `addons/website_sale/controllers/cart.py`: the cart endpoint calls the
  product-level add-to-cart boundary before writing a line.
- `addons/website_sale/views/res_config_settings_views.xml`: the
  `hide_add_to_cart_setting` configuration setting exposes the policy and
  Contact Us URL when enabled.
- `addons/website_sale/views/templates.xml`: the product page renders
  `website.contact_us_button_url` for the zero-price state and hides the cart
  controls.

Core3 pairing:

- `services/ecommerce/pages/zero-price-sale-policy.yaml` is page/UI YAML and
  joins `page.id: ecommerce-zero-price-sale-policy`.
- `services/ecommerce/api/zero-price-sale-policy.yaml` is API/action YAML;
  it exposes the company policy and optimistic update action.
- `services/ecommerce/migrations/20260921210000-106...yaml` and
  `20260921211000-107...yaml` durably store and seed the policy.
- `services/ecommerce/api/shop.yaml` exposes contact-only projections and
  enforces the policy for authenticated and anonymous add-to-cart actions.

Parity boundary: Core3 models the durable website/company policy and cart
boundary; it does not claim rendered Contact Us browser parity without the
available authenticated runtime.
