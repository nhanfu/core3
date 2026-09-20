# Source comparison

## Odoo Website Sale

- `addons/website_sale/models/product_template.py` defines
  `accessory_product_ids = fields.Many2many(...)` with `check_company=True`.
- `_get_website_accessory_product()` applies website-sale availability and
  publication filtering for non-internal visitors.
- `addons/website_sale/models/sale_order.py` implements `_cart_accessories()`:
  it derives accessory products from products in the cart, excludes products
  already in the cart, and applies sellability/company/combination checks.
- `addons/website_sale/views/product_views.xml` exposes the editor field with
  the help text “Suggested accessories in the eCommerce cart”.

## Core3 mapping

- Migrations `068` and `069` provide a durable ordered relation and
  deterministic Mug → Lamp / Chair → unpublished Setup fixtures.
- `api/product-detail.yaml` and `pages/product-detail.yaml` are separate
  contracts joined by `page.id: ecommerce-product-detail`; catalog writers
  assign/remove accessories with company, publication, duplicate, permission,
  and row-version guards.
- `api/cart.yaml` and `pages/cart.yaml` are separate contracts joined by
  `page.id: ecommerce-cart`; the customer-facing datasource filters inactive,
  unpublished, cross-company, and already-carted products. The add action uses
  the existing deterministic cart line identity and repeats safely.

Core3 uses its durable product records as the bounded mapping for Odoo's
product.product accessory target. Variant-specific accessory resolution is a
separate follow-up and is not claimed here.
