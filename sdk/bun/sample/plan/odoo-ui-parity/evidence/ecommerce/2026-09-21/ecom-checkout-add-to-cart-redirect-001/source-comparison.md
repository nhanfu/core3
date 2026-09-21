# Source comparison

## Odoo Website Sale

- `addons/website_sale/models/website.py`: `add_to_cart_action` is a website
  selection with `stay` and `go_to_cart`, defaulting to `stay`.
- `addons/website_sale/models/res_config_settings.py`: the configuration
  setting is a writable related field to `website_id.add_to_cart_action`.
- `addons/website_sale/views/res_config_settings_views.xml`: the
  `cart_redirect_setting` setting renders the `add_to_cart_action` radio field.
- `addons/website_sale/models/ir_http.py`: website session data includes
  `add_to_cart_action`.
- `addons/website_sale/static/src/js/cart_service.js`: `go_to_cart` redirects
  to `/shop/cart` after add-to-cart.
- `addons/website_sale/controllers/cart.py`: the public JSON route is
  `/shop/cart/add`.

## Core3 mapping

- Migrations `20260921220000-108` and `20260921221000-109` provide durable
  company policy storage, a check constraint, index, and deterministic fixture.
- `services/ecommerce/api/add-to-cart-policy.yaml` and
  `services/ecommerce/pages/add-to-cart-policy.yaml` remain separate and join
  through `page.id: ecommerce-add-to-cart-policy`.
- The Configuration manifest adds `/ecommerce/add-to-cart-policy`; reads use
  `ecommerce.read` and updates use `ecommerce.write`.
- `services/ecommerce/api/shop.yaml` returns `add_to_cart_action` and
  `redirect_path` from both authenticated and anonymous add-to-cart mutations,
  while preserving durable cart line writes.
