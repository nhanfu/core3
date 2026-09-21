# Source comparison

- Odoo `addons/website_sale/models/website.py` defines
  `product_page_image_ratio` and `product_page_image_ratio_mobile` with the
  eight supported values and defaults `1_1` and `auto`.
- Odoo `addons/website_sale/views/templates.xml` applies the desktop and
  mobile ratio values to product-image layout classes and emits the desktop
  value as `data-image-ratio`.
- Core3 migrations `20260921290000-122` and `20260921291000-123` provide the
  durable company policy and deterministic fixture.
- Core3 `api/product-page-image-ratio-policy.yaml` and
  `pages/product-page-image-ratio-policy.yaml` are separate contracts joined
  by `page.id`; Product Detail has a read-only effective-policy projection.

The supplied Odoo runtime was not available for an authenticated rendered
comparison.
