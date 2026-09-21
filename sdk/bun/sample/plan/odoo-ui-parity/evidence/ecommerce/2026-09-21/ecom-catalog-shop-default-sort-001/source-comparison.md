# Source comparison

Odoo Website Sale source inspected:

- `addons/website_sale/models/website.py`: `shop_default_sort` is a required
  website selection defaulting to `website_sequence asc`; its mapping exposes
  Featured, Newest Arrivals, Name (A-Z), Price - Low to High, and Price - High
  to Low.
- `addons/website_sale/controllers/main.py`: `WebsiteSale._get_search_order`
  uses an explicit request order or the current website's
  `shop_default_sort`, then appends a stable id order.
- `addons/website_sale/data/data.xml`: `menu_shop` and
  `action_open_website` bind the eCommerce Website Shop entry to `/shop`.
- `addons/website_sale/views/templates.xml`: shop markup carries
  `website.shop_default_sort` as the default sort state.
- `addons/website_sale/static/src/website_builder/products_list_page_option_plugin.js`:
  Website Builder persists the setting through `/shop/config/website`.

Core3 pairing:

- `services/ecommerce/pages/shop-default-sort.yaml` is page/UI YAML and joins
  `page.id: ecommerce-shop-default-sort`.
- `services/ecommerce/api/shop-default-sort.yaml` is API/action YAML; it
  exposes the company policy, five-option catalog, and optimistic
  `ecommerce.shop.default_sort.update` action.
- `services/ecommerce/migrations/20260921200000-104...yaml` and
  `20260921201000-105...yaml` durably store and seed the policy.
- `services/ecommerce/api/shop.yaml` and `operations.yaml` apply the policy to
  authenticated and public product ordering.

Parity boundary: Odoo's Website Builder route is represented by a permissioned
Core3 configuration action and durable company policy; explicit caller sort
parameters remain outside this bounded setting slice.
