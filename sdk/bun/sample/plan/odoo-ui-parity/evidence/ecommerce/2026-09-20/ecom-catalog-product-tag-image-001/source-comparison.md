# Source comparison

## Odoo

- `product/models/product_tag.py` defines the optional `image` field with
  `max_width=200` and `max_height=200`.
- `product/views/product_tag_views.xml` shows the image as an `oe_avatar` in
  the customer-visible form and as an optional image column in the list.
- `website_sale/models/product_tag.py` supplies the website mixin; the
  website tag rendering uses the image when present and falls back to its
  color/name presentation.
- The Product Tags action is `product.product_tag_action`, reached from the
  Website/eCommerce Products configuration menu.

## Core3

- `services/ecommerce/pages/product-tags.yaml` owns the list and opens
  `/ecommerce/product-tags/detail` through `view_ecommerce_product_tag`.
- `services/ecommerce/pages/product-tag-detail.yaml` owns the responsive
  `OdooFormView` and attachment labels/file accept contract.
- `services/ecommerce/api/product-tag-detail.yaml` owns the matching
  `page.id`, detail/image datasources, permissioned upload/download actions,
  image validation, replacement, and row-version mutation.
- Migration 052 creates durable image metadata; migration 053 keeps the
  deterministic Featured fixture idempotent. Attachment bytes use the
  Ecommerce local storage contract and are proven through restart tests.

The supplied Odoo references were authenticated successfully, but their
`/shop` route returned exact 404 responses on ports 8069 and 8073. No paired
Odoo Product Tags visual comparison is claimed.
