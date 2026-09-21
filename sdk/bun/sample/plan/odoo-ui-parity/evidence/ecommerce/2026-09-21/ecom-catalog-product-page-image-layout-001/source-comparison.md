# Source comparison

- Odoo `addons/website_sale/models/website.py` defines
  `product_page_image_layout` with `carousel` and `grid` values and defaults
  to Carousel.
- Odoo `addons/website_sale/views/templates.xml` emits the selected value as
  `data-image_layout` and selects `website_sale.shop_product_carousel` or
  `website_sale.shop_product_grid` from that policy.
- Core3 migrations `20260921310000-126` and `20260921311000-127` provide the
  durable company policy and deterministic fixture.
- Core3 `api/product-page-image-layout-policy.yaml` and
  `pages/product-page-image-layout-policy.yaml` are separate contracts joined
  by `page.id`; Product Detail has a read-only effective-layout projection.

The supplied Odoo runtime was not available for an authenticated rendered
comparison.
