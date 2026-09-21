# Source comparison

## Odoo Website Sale

The supplied Odoo source was inspected at:

- `/home/nhanjs/projects/odoo/addons/website_sale/models/product_feed.py` —
  `product.feed`, GMC target, language/pricelist/category configuration,
  access token, URL, cache expiry, product limit, and compressed feed cache.
- `/home/nhanjs/projects/odoo/addons/website_sale/controllers/product_feed.py`
  — token-checked `/gmc.xml`, website/feed validation, and XML response.
- `/home/nhanjs/projects/odoo/addons/website_sale/views/product_feed_views.xml`
  — Product Feed search/list/form and `action_product_feeds`.
- `/home/nhanjs/projects/odoo/addons/website_sale/views/website_sale_menus.xml`
  — Product Feeds menu binding.
- `/home/nhanjs/projects/odoo/addons/website_sale/security/res_groups.xml` —
  `group_product_feed` boundary.

## Core3 implementation

- `sample/services/ecommerce/migrations/20260921180000-100-ecommerce-product-feeds.yaml`
  adds durable feed records, token uniqueness, cache fields, and company
  indexes.
- `sample/services/ecommerce/migrations/20260921181000-101-ecommerce-product-feeds-demo.yaml`
  seeds deterministic `GMC 1` data.
- `sample/services/ecommerce/api/product-feeds.yaml` provides separate API
  sources, permissioned create/edit/generate/delete actions, XML generation,
  cache invalidation, and selector validation.
- `sample/services/ecommerce/pages/product-feeds.yaml` provides the responsive
  Product Feeds list contract.
- `sample/services/ecommerce/operations.yaml` exposes a token-checked public
  feed read after generation.

The Core3 feed uses the existing published same-company product and category
assignment data, with a deterministic `/shop/product/<id>` link shape. The
unavailable Odoo website route remains an explicit blocker.
