# Source comparison

- Odoo `addons/website_sale/models/website.py` defines
  `product_page_image_width` with `none`, `33_pc`, `50_pc`, `66_pc`, and
  `100_pc` values and defaults to `50_pc`.
- Odoo `addons/website_sale/views/templates.xml` applies the selected value
  to the product-page image-column CSS class.
- Core3 migrations `20260921320000-128` and `20260921321000-129` provide the
  durable company policy and deterministic fixture.
- Core3 `api/product-page-image-width-policy.yaml` and
  `pages/product-page-image-width-policy.yaml` are separate contracts joined
  by `page.id`; Product Detail has a read-only effective-width projection.

The supplied Odoo runtime was not available for an authenticated rendered
comparison.
