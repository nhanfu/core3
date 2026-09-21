# Source comparison

## Odoo 19

- `addons/website_sale/models/website.py:130-142` defines
  `shop_opt_products_design_classes`; its default class list includes
  `o_wsale_products_opt_has_wishlist`.
- `addons/website_sale_wishlist/static/src/website_builder/products_design_panel.xml:9-19`
  exposes the Wishlist builder toggle and writes the same class.
- `addons/website_sale_wishlist/views/website_sale_wishlist_template.xml:15-16`
  calls the shared product-tile visibility helper with
  `o_wsale_products_opt_has_wishlist`.
- `addons/website_sale_wishlist/static/src/scss/website_sale_wishlist.options.scss:3-10`
  defaults card wishlist buttons hidden and enables them for the class.
- `addons/website_sale/controllers/main.py:1835-1848` persists the Shop
  design-class field through the restricted website configuration endpoint.

## Core3

- `services/ecommerce/migrations/20260922120000-164-ecommerce-shop-product-wishlist.yaml`
  adds durable company-scoped policy storage.
- `services/ecommerce/migrations/20260922121000-165-ecommerce-shop-product-wishlist-demo.yaml`
  seeds the visible My Company default idempotently.
- `services/ecommerce/api/shop-product-wishlist-policy.yaml` and
  `services/ecommerce/pages/shop-product-wishlist-policy.yaml` remain
  separate and join through matching `page.id`.
- `services/ecommerce/api/shop.yaml` and `pages/shop.yaml` project the
  effective `show_wishlist` state onto Shop products and the Shop view.
- `services/ecommerce/manifest.yaml` adds the configuration menu entry; the
  update action requires `ecommerce.write` and uses company and optimistic
  row-version guards.
- `test/ecommerce_shop_product_wishlist.integration.test.ts` covers source
  parity, paired contracts, permissions, guards, projection, replay, and
  restart persistence.

## Gap result

The existing wishlist lifecycle and session-merge slices persist wishlist
records and operations, but the Shop card design-policy surface was absent.
This slice closes only that missing visibility policy.
