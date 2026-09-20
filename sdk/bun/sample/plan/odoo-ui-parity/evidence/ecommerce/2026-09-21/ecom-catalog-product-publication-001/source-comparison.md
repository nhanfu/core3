# Source comparison

## Odoo

- `addons/website/models/mixins.py` defines the Website Published mixin with
  durable `is_published`, computed/stored `publish_date`, and
  `website_publish_button`, which flips the published state.
- `addons/website_sale/models/product_template.py` inherits the published
  mixin, defines `publish_date` and recomputes it when a product is published.
- `addons/website_sale/views/product_views.xml` exposes the publication state
  through the website redirect button and boolean toggle on the product form;
  the Published search filter is also present.

## Core3 mapping

- Migrations `086/087` add `ecommerce_products.publish_date` and deterministic
  dates for the published Mug, Chair, and Lamp fixtures.
- Products and Product Detail retain separate page/API YAML contracts joined
  by their page IDs. Both APIs expose explicit `publish_ecommerce_product` and
  `unpublish_ecommerce_product` actions requiring `ecommerce.write`.
- Each action validates active/current-company ownership and expected row
  version, updates `is_published` plus `publish_date`, refreshes Products,
  Product Detail, and Shop sources, and leaves the public shop projection
  limited to active published products.
- Product Variant Detail displays the parent product publication timestamp.

The implementation is bounded to product publication state and timestamp. It
does not claim public `/shop` rendering, website editor/redirect parity, or
multi-website publication behavior.
